/** Fixed-batch teaching model: one processor, equal-length requests, no continuous batching. */
export type Batch = { start: number; end: number; ids: number[] };
export type BatchedRequest = {
  id: number;
  arrival: number;
  start: number;
  end: number;
};
export function simulateBatching(
  rate: number,
  size: number,
  window: number,
  count = 12,
) {
  if (
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isInteger(size) ||
    size < 1 ||
    !Number.isFinite(window) ||
    window < 0 ||
    !Number.isInteger(count) ||
    count < 1
  )
    throw new Error('Invalid batching configuration');
  const arrivals = Array.from({ length: count }, (_, i) => i / rate);
  const batches: Batch[] = [],
    requests: BatchedRequest[] = [];
  let next = 0,
    free = 0;
  while (next < count) {
    const fullAt = next + size <= count ? arrivals[next + size - 1] : Infinity;
    const start = Math.max(free, Math.min(fullAt, arrivals[next] + window));
    const ids: number[] = [];
    while (next < count && ids.length < size && arrivals[next] <= start + 1e-9)
      ids.push(next++);
    // Shared overhead + modest per-item work. Illustrative, not a hardware benchmark.
    const end = start + 1.2 + 0.12 * (ids.length - 1);
    batches.push({ start, end, ids });
    requests.push(
      ...ids.map((id) => ({ id, arrival: arrivals[id], start, end })),
    );
    free = end;
  }
  return {
    batches,
    requests,
    total: free,
    throughput: count / free,
    averageLatency: requests.reduce((s, r) => s + r.end - r.arrival, 0) / count,
    firstLatency: requests[0].end - requests[0].arrival,
  };
}
