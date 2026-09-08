import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateBatching } from '../lib/batching';
test('batch size one matches serial processing regardless of collection window', () => {
  assert.deepEqual(simulateBatching(3, 1, 1), simulateBatching(3, 1, 0));
  assert.equal(simulateBatching(3, 1, 0).batches.length, 12);
});
test('busy traffic benefits from batching while collection can delay the first response', () => {
  const serial = simulateBatching(3, 1, 0),
    grouped = simulateBatching(3, 4, 0.5);
  assert.ok(grouped.throughput > serial.throughput);
  assert.ok(grouped.averageLatency < serial.averageLatency);
  assert.ok(grouped.firstLatency > serial.firstLatency);
  const light = simulateBatching(0.5, 4, 1.5),
    lightSerial = simulateBatching(0.5, 1, 0);
  assert.ok(light.averageLatency > lightSerial.averageLatency);
});
test('batches respect arrivals, capacity, processor availability and final partial batches', () => {
  for (const size of [1, 4, 6])
    for (const rate of [0.5, 3, 4])
      for (const window of [0, 0.5, 1.5]) {
        const r = simulateBatching(rate, size, window, 11);
        assert.equal(new Set(r.requests.map((q) => q.id)).size, 11);
        assert.deepEqual(r, simulateBatching(rate, size, window, 11));
        r.batches.forEach((b, i) => {
          assert.ok(b.ids.length > 0 && b.ids.length <= size);
          assert.ok(i === 0 || b.start >= r.batches[i - 1].end);
          b.ids.forEach((id) => assert.ok(id / rate <= b.start + 1e-9));
        });
        assert.ok(
          r.requests.every(
            (q) => q.start >= q.arrival - 1e-9 && q.end > q.start,
          ),
        );
      }
});
