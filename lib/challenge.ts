import {
  MODELS,
  capacityCost,
  streaming,
  tokenCost,
  type Model,
} from './simulation';
import {
  CHALLENGE_WORKLOAD,
  type ChallengeQuestion,
} from './challenge-content';

export type ChallengeConfig = {
  model: Model;
  context: number;
  tokens: number;
  workers: number;
  cache: 'Off' | 'Saved answers' | 'Refresh on update';
  delivery: 'Streamed' | 'Buffered';
};
export const DEFAULT_CHALLENGE: ChallengeConfig = {
  model: 'Lightweight',
  context: 0,
  tokens: 16,
  workers: 1,
  cache: 'Off',
  delivery: 'Buffered',
};
export const CHALLENGE_LIMITS = {
  accuracy: 0.9,
  firstToken: 2,
  completion: 6,
  budget: 0.0065,
};
export type AnswerIssue =
  | 'Missing context'
  | 'Missing exception'
  | 'Incomplete answer'
  | 'Missed exception'
  | 'Stale answer';
type PreparedAnswer = {
  text: string;
  issue: AnswerIssue | null;
  version: number;
};

function prepareAnswer(
  question: ChallengeQuestion,
  config: ChallengeConfig,
  version: number,
): PreparedAnswer {
  if (config.context === 0)
    return {
      text: 'I do not have the reference material to answer this question.',
      issue: 'Missing context',
      version,
    };
  if (config.context < question.docs)
    return {
      text: question.exceptionAnswer ?? question.incomplete,
      issue: 'Missing exception',
      version,
    };
  if (config.tokens < question.minTokens)
    return { text: question.incomplete, issue: 'Incomplete answer', version };
  if (
    config.model === 'Lightweight' &&
    question.reasoning &&
    config.context < 3
  )
    return {
      text: question.exceptionAnswer!,
      issue: 'Missed exception',
      version,
    };
  return {
    text: version === 2 ? question.updatedAnswer! : question.answer,
    issue: null,
    version,
  };
}

export function percentile(values: number[], proportion: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * proportion) - 1)] ?? 0;
}

export function simulateChallenge(config: ChallengeConfig) {
  if (
    !Object.hasOwn(MODELS, config.model) ||
    !Number.isInteger(config.context) ||
    config.context < 0 ||
    config.context > 4 ||
    ![16, 32, 48, 64, 80].includes(config.tokens) ||
    !Number.isInteger(config.workers) ||
    config.workers < 1 ||
    config.workers > 4 ||
    !['Off', 'Saved answers', 'Refresh on update'].includes(config.cache) ||
    !['Streamed', 'Buffered'].includes(config.delivery)
  ) {
    throw new Error('Invalid challenge configuration.');
  }
  const model = MODELS[config.model];
  const free = Array<number>(config.workers).fill(0);
  const cache = new Map<string, { end: number; answer: PreparedAnswer }[]>();
  const requests = CHALLENGE_WORKLOAD.map(
    ({ id, question, arrival, version }) => {
      const key =
        config.cache === 'Refresh on update'
          ? `${question.id}:${version}`
          : question.id;
      // In-flight answers cannot be reused. Source versions are captured at arrival.
      const saved =
        config.cache === 'Off'
          ? undefined
          : cache
              .get(key)
              ?.filter((entry) => entry.end <= arrival)
              .sort((a, b) => b.end - a.end)[0];
      const hit = !!saved;
      const worker = hit ? -1 : free.indexOf(Math.min(...free));
      const start = hit ? arrival : Math.max(arrival, free[worker]);
      const input = hit ? 0 : 60 + config.context * 90;
      const output = hit ? 0 : config.tokens;
      const firstDelay = hit ? 0.25 : model.wait + config.context * 0.14;
      const timing = hit
        ? { total: 0.25, firstVisible: 0.25 }
        : streaming(
            firstDelay,
            model.speed,
            output,
            config.delivery === 'Streamed',
          );
      const end = start + timing.total;
      const answer = saved?.answer ?? prepareAnswer(question, config, version);
      const stale = hit && answer.version !== version;
      const issue: AnswerIssue | null = stale ? 'Stale answer' : answer.issue;
      if (!hit) {
        free[worker] = end;
        if (config.cache !== 'Off')
          cache.set(key, [...(cache.get(key) ?? []), { end, answer }]);
      }
      return {
        id,
        question,
        arrival,
        version,
        start,
        end,
        worker,
        input,
        output,
        hit,
        stale,
        issue,
        answer: answer.text,
        expected: version === 2 ? question.updatedAnswer! : question.answer,
        first: start + timing.firstVisible,
        generatedFirst: start + firstDelay,
        wait: start - arrival,
        service: timing.total,
        cost: tokenCost(input, output, 1, config.model).total,
        correct: issue === null,
      };
    },
  );
  const total = Math.max(...requests.map((r) => r.end));
  const modelCost = requests.reduce((sum, r) => sum + r.cost, 0);
  const workerCost = (capacityCost(config.workers) * total) / 3600;
  const cost = modelCost + workerCost;
  const correct = requests.filter((r) => r.correct).length;
  const accuracy = correct / requests.length;
  const firstToken = percentile(
    requests.map((r) => r.first - r.arrival),
    0.9,
  );
  const completion = percentile(
    requests.map((r) => r.end - r.arrival),
    0.9,
  );
  const stale = requests.filter((r) => r.stale).length;
  const checks = [
    {
      id: 'accuracy',
      label: 'Accuracy',
      target: 'At least 18 / 20 correct',
      value: `${correct} / 20`,
      pass: accuracy >= CHALLENGE_LIMITS.accuracy,
    },
    {
      id: 'first',
      label: 'First response',
      target: '90% within 2 seconds',
      value: `${firstToken.toFixed(2)} s`,
      pass: firstToken <= CHALLENGE_LIMITS.firstToken,
    },
    {
      id: 'completion',
      label: 'Full answer',
      target: '90% within 6 seconds',
      value: `${completion.toFixed(2)} s`,
      pass: completion <= CHALLENGE_LIMITS.completion,
    },
    {
      id: 'budget',
      label: 'Test budget',
      target: 'At most 0.65¢ for 20 requests',
      value: `${(cost * 100).toFixed(3)}¢`,
      pass: cost <= CHALLENGE_LIMITS.budget,
    },
    {
      id: 'freshness',
      label: 'Freshness',
      target: 'No outdated cached answers',
      value: `${stale} stale`,
      pass: stale === 0,
    },
  ];
  const failures: { title: string; detail: string }[] = [];
  const issueCounts = new Map<AnswerIssue, number>();
  for (const r of requests)
    if (r.issue) issueCounts.set(r.issue, (issueCounts.get(r.issue) ?? 0) + 1);
  const reasons: Record<AnswerIssue, string> = {
    'Missing context': 'The prompt had no source material.',
    'Missing exception':
      'The retrieved context did not include a required detail.',
    'Incomplete answer':
      'The answer limit left part of the question unanswered.',
    'Missed exception':
      'This model missed an exception in the retrieved material.',
    'Stale answer': 'Saved responses still used the old library hours.',
  };
  for (const [issue, count] of issueCounts)
    failures.push({
      title: `${issue} · ${count} ${count === 1 ? 'answer' : 'answers'}`,
      detail: reasons[issue],
    });
  if (firstToken > CHALLENGE_LIMITS.firstToken) {
    const late = requests.filter(
      (r) => r.first - r.arrival > CHALLENGE_LIMITS.firstToken,
    );
    failures.push({
      title: `${late.length} responses started late`,
      detail:
        config.delivery === 'Buffered'
          ? 'Buffered delivery held the response until generation finished. Queue time is included.'
          : `${late.filter((r) => r.wait > 0).length} of those requests waited for an available worker.`,
    });
  }
  if (completion > CHALLENGE_LIMITS.completion)
    failures.push({
      title: 'Answers took too long',
      detail:
        'Full-answer time includes both the queue and generation. Longer responses keep workers busy for longer.',
    });
  if (cost > CHALLENGE_LIMITS.budget)
    failures.push({
      title: 'Over budget',
      detail: `Model usage cost ${(modelCost * 100).toFixed(3)}¢ and worker time cost ${(workerCost * 100).toFixed(3)}¢. ${requests.filter((r) => !r.hit).length} requests needed a new model response.`,
    });
  return {
    requests,
    total,
    modelCost,
    workerCost,
    cost,
    correct,
    accuracy,
    firstToken,
    completion,
    stale,
    checks,
    failures,
    passed: checks.every((check) => check.pass),
  };
}

export type ChallengeResult = ReturnType<typeof simulateChallenge>;
