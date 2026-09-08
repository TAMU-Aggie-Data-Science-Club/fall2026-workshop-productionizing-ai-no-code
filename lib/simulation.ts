/** Illustrative rules, not provider benchmarks. */
export const TOKENS = [
  'As',
  ' days',
  ' get',
  ' shorter',
  ',',
  ' leaves',
  ' produce',
  ' less',
  ' chloro',
  'phyll',
  '.',
  ' The',
  ' green',
  ' pigment',
  ' fades',
  ',',
  ' revealing',
  ' yellow',
  ' and',
  ' orange',
  ' pigments',
  ' that',
  ' were',
  ' already',
  ' there',
  '.',
  ' Some',
  ' trees',
  ' also',
  ' produce',
  ' red',
  ' pigments',
  ' in',
  ' the',
  ' fall',
  '.',
];
export function streaming(
  wait: number,
  speed: number,
  tokens: number,
  streamed = true,
) {
  const total = wait + Math.max(0, tokens - 1) / speed;
  return { total, firstVisible: streamed ? wait : total };
}

export type Model = 'Lightweight' | 'Capable';
export const MODELS = {
  Lightweight: { speed: 28, wait: 0.4, inputRate: 0.2, outputRate: 0.8 },
  Capable: { speed: 14, wait: 0.9, inputRate: 1, outputRate: 3 },
};
export function tokenCost(
  input: number,
  output: number,
  requests = 1,
  model: Model = 'Capable',
) {
  const rates = MODELS[model];
  const inputCost = ((input * rates.inputRate) / 1_000_000) * requests;
  const outputCost = ((output * rates.outputRate) / 1_000_000) * requests;
  return { inputCost, outputCost, total: inputCost + outputCost };
}
export type RequestSlot = {
  id: number;
  arrival: number;
  start: number;
  end: number;
  wait: number;
  service: number;
  worker: number;
};
export function schedule(
  rate: number,
  workers: number,
  count = 12,
  service = 1.8,
): RequestSlot[] {
  const free = Array(workers).fill(0) as number[];
  return Array.from({ length: count }, (_, id) => {
    const arrival = id / rate,
      worker = free.indexOf(Math.min(...free));
    const start = Math.max(arrival, free[worker]),
      end = start + service;
    free[worker] = end;
    return { id, arrival, start, end, wait: start - arrival, service, worker };
  });
}
export const capacityCost = (workers: number) => workers * 0.04;
export type CacheState = { version: number } | null;
export function cacheRequest(
  enabled: boolean,
  cache: CacheState,
  sourceVersion: number,
) {
  const hit = enabled && cache !== null;
  const answerVersion = hit ? cache.version : sourceVersion;
  return {
    hit,
    stale: answerVersion !== sourceVersion,
    answerVersion,
    duration: hit
      ? 0.25
      : streaming(MODELS.Capable.wait, MODELS.Capable.speed, 24).total,
    cost: hit ? 0 : tokenCost(140, 24).total,
    nextCache: enabled ? { version: answerVersion } : cache,
  };
}
export type Workload = 'Simple question' | 'Needs reference' | 'Repeated burst';
export type PlaygroundConfig = {
  model: Model;
  context: number;
  tokens: number;
  cache: boolean;
  workers: number;
  workload: Workload;
};
export const DEFAULT_CONFIG: PlaygroundConfig = {
  model: 'Capable',
  context: 2,
  tokens: 48,
  cache: false,
  workers: 1,
  workload: 'Simple question',
};
export type AppRequest = RequestSlot & {
  first: number;
  input: number;
  output: number;
  cost: number;
  hit: boolean;
  key: string;
  answer: string;
};
export function answerKey(
  model: Model,
  context: number,
  tokens: number,
  needsReference: boolean,
) {
  if (needsReference && context === 0) return 'missing';
  if (tokens < 24) return needsReference ? 'incomplete' : 'simple-short';
  if (needsReference && context < 2) return 'partial';
  if (needsReference && model === 'Lightweight') return 'partial';
  return needsReference ? 'grounded' : 'simple';
}
export function simulateApp(config: PlaygroundConfig) {
  const model = MODELS[config.model],
    free = Array(config.workers).fill(0) as number[];
  const count = config.workload === 'Repeated burst' ? 8 : 1;
  // A cached result is available only AFTER the original request completes.
  const cached = new Map<string, number>();
  const requests: AppRequest[] = [];
  for (let id = 0; id < count; id++) {
    const arrival = id * 0.8,
      key =
        config.workload === 'Repeated burst'
          ? id % 3 === 0
            ? 'reference'
            : 'simple'
          : config.workload === 'Needs reference'
            ? 'reference'
            : 'simple';
    const hit = config.cache && cached.has(key) && cached.get(key)! <= arrival;
    const worker = hit ? -1 : free.indexOf(Math.min(...free));
    const start = hit ? arrival : Math.max(arrival, free[worker]);
    const input = hit ? 0 : 60 + config.context * 90;
    const output = hit ? 0 : config.tokens;
    const firstDelay = hit ? 0.25 : model.wait + config.context * 0.14;
    const service = hit
      ? 0.25
      : streaming(firstDelay, model.speed, output).total;
    const end = start + service;
    if (!hit) {
      free[worker] = end;
      if (config.cache && (!cached.has(key) || cached.get(key)! > end))
        cached.set(key, end);
    }
    requests.push({
      id,
      key,
      arrival,
      start,
      end,
      wait: start - arrival,
      service,
      worker,
      first: start + firstDelay,
      input,
      output,
      cost: tokenCost(input, output, 1, config.model).total,
      hit,
      answer: answerKey(
        config.model,
        config.context,
        config.tokens,
        key === 'reference',
      ),
    });
  }
  const total = Math.max(...requests.map((r) => r.end));
  const modelCost = requests.reduce((s, r) => s + r.cost, 0);
  const infrastructureCost = (capacityCost(config.workers) * total) / 3600;
  return {
    requests,
    total,
    firstVisible: requests[0].first,
    modelCost,
    infrastructureCost,
    cost: modelCost + infrastructureCost,
    cacheHits: requests.filter((r) => r.hit).length,
    averageWait: requests.reduce((s, r) => s + r.wait, 0) / count,
  };
}
