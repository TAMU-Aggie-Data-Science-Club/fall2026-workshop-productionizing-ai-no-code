import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  streaming,
  tokenCost,
  schedule,
  cacheRequest,
  simulateApp,
  DEFAULT_CONFIG,
  capacityCost,
  MODELS,
  answerKey,
} from '../lib/simulation';
import { contextAnswer, QUALITY_CASES } from '../lib/content';
test('streaming reveals the first token early without changing completion time', () => {
  assert.deepEqual(streaming(1, 10, 31), { firstVisible: 1, total: 4 });
  assert.deepEqual(streaming(1, 10, 31, false), { firstVisible: 4, total: 4 });
  assert.equal(streaming(1, 20, 31).total, 2.5);
});
test('cost separates input/output and scales with request volume', () => {
  const single = tokenCost(1000, 1000),
    scaled = tokenCost(1000, 1000, 1000);
  assert.equal(single.inputCost, 0.001);
  assert.equal(single.outputCost, 0.003);
  assert.equal(scaled.total, single.total * 1000);
  assert.ok(tokenCost(1000, 1000, 1, 'Lightweight').total < single.total);
});
test('workers reduce queues without shortening processing time', () => {
  const one = schedule(3, 1),
    four = schedule(3, 4);
  assert.ok(
    one.reduce((s, r) => s + r.wait, 0) > four.reduce((s, r) => s + r.wait, 0),
  );
  for (const r of [...one, ...four]) {
    assert.equal(r.service, 1.8);
    assert.ok(r.start >= r.arrival);
  }
  assert.equal(capacityCost(4), 0.16);
});
test('answer cache reuses stale results until cleared; disabled caching bypasses it', () => {
  const first = cacheRequest(true, null, 1);
  assert.equal(first.hit, false);
  const repeat = cacheRequest(true, first.nextCache, 1);
  assert.equal(repeat.hit, true);
  assert.equal(repeat.cost, 0);
  const stale = cacheRequest(true, first.nextCache, 2);
  assert.equal(stale.stale, true);
  assert.equal(stale.answerVersion, 1);
  assert.equal(cacheRequest(true, null, 2).answerVersion, 2);
  assert.equal(cacheRequest(false, first.nextCache, 2).hit, false);
  assert.equal(cacheRequest(false, first.nextCache, 2).answerVersion, 2);
});
test('retrieval distinguishes missing evidence, exceptions, and distracting notes', () => {
  assert.equal(contextAnswer('Exam week', 0).state, 'Missing reference');
  assert.equal(contextAnswer('Exam week', 1).state, 'Missing the exception');
  assert.equal(contextAnswer('Exam week', 2).state, 'Supported answer');
  assert.equal(
    contextAnswer('Exam week', 4).text,
    contextAnswer('Exam week', 2).text,
  );
  assert.notEqual(
    contextAnswer('Regular hours', 2).text,
    contextAnswer('Exam week', 2).text,
  );
});
test('a citation can pass while evidence fails, and true facts can be incomplete', () => {
  assert.deepEqual(QUALITY_CASES['Library hours'].results.Unsupported, [
    true,
    false,
    true,
  ]);
  assert.deepEqual(QUALITY_CASES['Study rooms'].results.Incomplete, [
    false,
    true,
    true,
  ]);
});
test('playground shares streaming, cost, and worker-rate rules', () => {
  const result = simulateApp(DEFAULT_CONFIG),
    r = result.requests[0];
  assert.equal(r.input, 60 + 90 * DEFAULT_CONFIG.context);
  assert.equal(
    r.cost,
    tokenCost(r.input, r.output, 1, DEFAULT_CONFIG.model).total,
  );
  assert.equal(
    r.service,
    streaming(
      MODELS.Capable.wait + DEFAULT_CONFIG.context * 0.14,
      MODELS.Capable.speed,
      DEFAULT_CONFIG.tokens,
    ).total,
  );
  assert.equal(
    result.cost,
    result.modelCost +
      (capacityCost(DEFAULT_CONFIG.workers) * result.total) / 3600,
  );
});
test('replay is deterministic and only completed matching requests can hit cache', () => {
  const config = {
    ...DEFAULT_CONFIG,
    workload: 'Repeated burst' as const,
    cache: true,
    model: 'Lightweight' as const,
    tokens: 32,
  };
  const r = simulateApp(config);
  assert.deepEqual(r, simulateApp(config));
  assert.ok(r.cacheHits > 0);
  for (const hit of r.requests.filter((q) => q.hit))
    assert.ok(
      r.requests.some(
        (q) => !q.hit && q.key === hit.key && q.end <= hit.arrival,
      ),
    );
  assert.equal(simulateApp({ ...config, cache: false }).cacheHits, 0);
});
test('output examples express limits without a universal quality score', () => {
  assert.equal(answerKey('Lightweight', 2, 48, true), 'partial');
  assert.equal(answerKey('Capable', 2, 48, true), 'grounded');
  assert.equal(answerKey('Capable', 0, 48, true), 'missing');
  assert.equal(answerKey('Capable', 1, 48, true), 'partial');
  assert.equal(answerKey('Capable', 2, 16, true), 'incomplete');
  assert.equal(answerKey('Lightweight', 2, 48, false), 'simple');
});
