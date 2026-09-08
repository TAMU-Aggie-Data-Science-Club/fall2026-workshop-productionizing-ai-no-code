import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGE_WORKLOAD } from '../lib/challenge-content';
import {
  CHALLENGE_LIMITS,
  DEFAULT_CHALLENGE,
  percentile,
  simulateChallenge,
  type ChallengeConfig,
} from '../lib/challenge';
import { MODELS, capacityCost, streaming, tokenCost } from '../lib/simulation';

const capable: ChallengeConfig = {
  model: 'Capable',
  context: 2,
  tokens: 32,
  workers: 4,
  cache: 'Refresh on update',
  delivery: 'Streamed',
};
const lightweight: ChallengeConfig = {
  model: 'Lightweight',
  context: 3,
  tokens: 32,
  workers: 3,
  cache: 'Off',
  delivery: 'Streamed',
};

test('accuracy is determined by inspectable answers on the fixed workload', () => {
  assert.equal(CHALLENGE_WORKLOAD.length, 20);
  assert.equal(new Set(CHALLENGE_WORKLOAD.map((r) => r.question.id)).size, 10);
  assert.equal(simulateChallenge(DEFAULT_CHALLENGE).correct, 0);
  const missing = simulateChallenge({ ...capable, context: 1 });
  assert.ok(missing.requests.some((r) => r.issue === 'Missing exception'));
  const short = simulateChallenge({ ...capable, tokens: 16 });
  assert.ok(short.requests.some((r) => r.issue === 'Incomplete answer'));
  const lite = simulateChallenge({ ...capable, model: 'Lightweight' });
  assert.equal(lite.correct, 16);
  assert.ok(
    lite.requests.filter((r) => !r.correct).every((r) => r.question.reasoning),
  );
  const supported = simulateChallenge(lightweight);
  assert.equal(supported.correct, 20);
  for (const r of supported.requests) assert.equal(r.answer, r.expected);
});

test('freshness catches stale responses even when overall accuracy reaches 90 percent', () => {
  const stale = simulateChallenge({ ...capable, cache: 'Saved answers' });
  const refreshed = simulateChallenge(capable);
  assert.equal(stale.correct, 18);
  assert.equal(stale.accuracy, CHALLENGE_LIMITS.accuracy);
  assert.equal(stale.stale, 2);
  assert.equal(
    stale.checks.find((check) => check.id === 'accuracy')?.pass,
    true,
  );
  assert.equal(
    stale.checks.find((check) => check.id === 'freshness')?.pass,
    false,
  );
  assert.equal(stale.passed, false);
  assert.equal(refreshed.stale, 0);
  assert.equal(refreshed.correct, 20);
  assert.equal(refreshed.requests.filter((r) => r.hit).length, 8);
  assert.ok(stale.cost < refreshed.cost);
  assert.ok(
    stale.failures.some((failure) =>
      failure.detail.includes('old library hours'),
    ),
  );
});

test('cache hits only reuse completed matching answers and never add model cost', () => {
  for (const cache of ['Off', 'Saved answers', 'Refresh on update'] as const) {
    for (const workers of [1, 4]) {
      const result = simulateChallenge({
        ...capable,
        tokens: 80,
        cache,
        workers,
      });
      for (const request of result.requests) {
        if (!request.hit) continue;
        assert.equal(request.cost, 0);
        assert.equal(request.worker, -1);
        assert.equal(request.wait, 0);
        const original = result.requests.find(
          (r) =>
            !r.hit &&
            r.question.id === request.question.id &&
            r.end <= request.arrival &&
            r.answer === request.answer &&
            (cache !== 'Refresh on update' || r.version === request.version),
        );
        assert.ok(
          original,
          'a hit must have a completed, compatible source response',
        );
      }
    }
  }
});

test('timing includes queue wait and shares streaming, token rates and worker costs', () => {
  const config = { ...capable, cache: 'Off' as const };
  const result = simulateChallenge(config);
  const buffered = simulateChallenge({ ...config, delivery: 'Buffered' });
  const model = MODELS[config.model];
  assert.equal(result.cost, buffered.cost);
  assert.equal(result.total, buffered.total);
  for (const r of result.requests) {
    const expected = streaming(
      model.wait + config.context * 0.14,
      model.speed,
      config.tokens,
    );
    assert.ok(Math.abs(r.service - expected.total) < 1e-10);
    assert.ok(
      Math.abs(
        r.first - r.arrival - (r.wait + model.wait + config.context * 0.14),
      ) < 1e-10,
    );
    assert.equal(
      r.cost,
      tokenCost(60 + config.context * 90, config.tokens, 1, config.model).total,
    );
    assert.equal(buffered.requests[r.id].first, buffered.requests[r.id].end);
  }
  assert.equal(
    result.workerCost,
    (capacityCost(config.workers) * result.total) / 3600,
  );
  assert.equal(
    result.cost,
    result.requests.reduce((sum, r) => sum + r.cost, 0) + result.workerCost,
  );
  const queued = simulateChallenge({ ...config, workers: 1 });
  assert.ok(queued.firstToken > result.firstToken);
  for (let worker = 0; worker < config.workers; worker++) {
    const jobs = result.requests.filter((r) => r.worker === worker);
    for (let index = 1; index < jobs.length; index++)
      assert.ok(jobs[index].start >= jobs[index - 1].end);
  }
  assert.equal(
    percentile(
      Array.from({ length: 20 }, (_, index) => index + 1),
      0.9,
    ),
    18,
  );
});

test('tests replay deterministically and each run starts with an empty cache', () => {
  const result = simulateChallenge(capable);
  assert.deepEqual(simulateChallenge(capable), result);
  assert.ok(result.requests.slice(0, 10).every((r) => !r.hit));
  assert.deepEqual(capable, {
    model: 'Capable',
    context: 2,
    tokens: 32,
    workers: 4,
    cache: 'Refresh on update',
    delivery: 'Streamed',
  });
});

test('several configurations can pass, while defaults and maximum settings have meaningful failures', () => {
  assert.equal(simulateChallenge(capable).passed, true);
  assert.equal(simulateChallenge(lightweight).passed, true);
  assert.equal(simulateChallenge(DEFAULT_CHALLENGE).passed, false);
  const largest = simulateChallenge({ ...capable, context: 4, tokens: 80 });
  assert.equal(
    largest.checks.find((check) => check.id === 'accuracy')?.pass,
    true,
  );
  for (const id of ['budget', 'first', 'completion'])
    assert.equal(largest.checks.find((check) => check.id === id)?.pass, false);
  assert.ok(
    largest.failures.some((failure) => failure.title === 'Over budget'),
  );
  const passing = new Set<string>();
  for (const model of ['Lightweight', 'Capable'] as const)
    for (const context of [0, 1, 2, 3, 4])
      for (const tokens of [16, 32, 48, 64, 80])
        for (const workers of [1, 2, 3, 4])
          for (const cache of [
            'Off',
            'Saved answers',
            'Refresh on update',
          ] as const)
            for (const delivery of ['Streamed', 'Buffered'] as const) {
              const r = simulateChallenge({
                model,
                context,
                tokens,
                workers,
                cache,
                delivery,
              });
              assert.equal(
                r.passed,
                r.checks.every((check) => check.pass),
              );
              assert.ok(
                Number.isFinite(r.total) &&
                  r.total > 0 &&
                  Number.isFinite(r.cost) &&
                  r.cost > 0,
              );
              if (r.passed) passing.add(model);
            }
  assert.deepEqual([...passing].sort(), ['Capable', 'Lightweight']);
});

test('invalid configs cannot create impossible capacity or token limits', () => {
  for (const change of [
    { workers: 0 },
    { context: 9 },
    { tokens: 0 },
    { workers: 1.5 },
    { cache: 'Unknown' },
    { model: 'Unknown' },
  ]) {
    assert.throws(
      () => simulateChallenge({ ...capable, ...change } as ChallengeConfig),
      /Invalid challenge/,
    );
  }
});
