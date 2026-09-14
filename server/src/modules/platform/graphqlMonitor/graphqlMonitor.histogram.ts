/**
 * A latency histogram that survives being added up.
 *
 * Percentiles do not add: the p95 of two hours is not the average of their
 * p95s. What does add is a count per duration bucket, so every stored rollup
 * keeps one of these and a percentile is read off the SUM for whatever range
 * is asked for — the same technique Apollo GraphOS uses for its latency charts.
 *
 * Buckets grow by 20% each: bucket 0 holds everything up to 1 ms, bucket i
 * holds (1.2^(i-1), 1.2^i] ms. A reading is therefore accurate to within one
 * bucket (±10%), at a size of a few dozen numbers per rollup however many
 * requests it counts.
 */

const GROWTH = 1.2;
const LOG_GROWTH = Math.log(GROWTH);
/** 1.2^90 ms is over 36 hours — nothing a request takes lands past it. */
const MAX_INDEX = 90;

/** Sparse bucket counts keyed `b<index>`, which is also how Mongo stores them. */
export type Histogram = Record<string, number>;

export function bucketIndex(ms: number): number {
  if (ms <= 1) return 0;
  return Math.min(MAX_INDEX, Math.ceil(Math.log(ms) / LOG_GROWTH));
}

export const bucketKey = (index: number): string => `b${index}`;

/** The largest duration a bucket holds. */
export const bucketUpperMs = (index: number): number => GROWTH ** index;

export function addToHistogram(histogram: Histogram, ms: number): void {
  const key = bucketKey(bucketIndex(ms));
  histogram[key] = (histogram[key] ?? 0) + 1;
}

export function mergeHistogram(into: Histogram, from: Histogram): void {
  for (const [key, count] of Object.entries(from)) {
    into[key] = (into[key] ?? 0) + count;
  }
}

/** [index, count] pairs, fastest bucket first. */
function sortedBuckets(histogram: Histogram): Array<[number, number]> {
  const buckets = Object.entries(histogram)
    .map(([key, count]): [number, number] => [Number.parseInt(key.slice(1), 10), count])
    .filter(([index, count]) => Number.isFinite(index) && count > 0);
  buckets.sort((a, b) => a[0] - b[0]);
  return buckets;
}

/**
 * The duration `p` percent of requests finished within, as the upper edge of
 * the bucket the percentile falls in — capped at the slowest request actually
 * seen, so a single request never reads slower than it was.
 */
export function percentileMs(histogram: Histogram, p: number, maxMs: number): number {
  const buckets = sortedBuckets(histogram);
  const total = buckets.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return 0;
  const rank = Math.ceil((p / 100) * total);
  let seen = 0;
  for (const [index, count] of buckets) {
    seen += count;
    if (seen >= rank) return round1(Math.min(bucketUpperMs(index), maxMs));
  }
  return round1(maxMs);
}

/** Every non-empty bucket, for the latency distribution chart. */
export function distribution(histogram: Histogram): Array<{ le_ms: number; count: number }> {
  return sortedBuckets(histogram).map(([index, count]) => ({ le_ms: round1(bucketUpperMs(index)), count }));
}

export const round1 = (n: number): number => Math.round(n * 10) / 10;
