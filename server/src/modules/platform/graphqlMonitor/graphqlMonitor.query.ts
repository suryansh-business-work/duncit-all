import { GraphQLError } from 'graphql';
import type { PipelineStage } from 'mongoose';
import { mergeHistogram, percentileMs, round1, type Histogram } from './graphqlMonitor.histogram';
import { GraphqlOperationStatModel, type StatGranularity } from './graphqlMonitor.model';

/**
 * The aggregation primitives every monitor read is built from.
 *
 * Three questions, asked of the operation rollups: the summed counters for a
 * group, the summed latency histogram for a group, and a tally of one of the
 * counted maps (clients, error codes). A percentile is only ever read off a
 * summed histogram — see graphqlMonitor.histogram.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

interface RangeSpec {
  ms: number;
  granularity: StatGranularity;
  step: number;
}

/** Short ranges read minute rollups; anything past six hours reads hourly ones. */
const RANGES: Record<string, RangeSpec> = {
  LAST_HOUR: { ms: HOUR_MS, granularity: 'MINUTE', step: MINUTE_MS },
  LAST_6_HOURS: { ms: 6 * HOUR_MS, granularity: 'MINUTE', step: 5 * MINUTE_MS },
  LAST_24_HOURS: { ms: DAY_MS, granularity: 'HOUR', step: HOUR_MS },
  LAST_7_DAYS: { ms: 7 * DAY_MS, granularity: 'HOUR', step: 3 * HOUR_MS },
  LAST_30_DAYS: { ms: 30 * DAY_MS, granularity: 'HOUR', step: 12 * HOUR_MS },
};

export interface ResolvedRange {
  from: Date;
  granularity: StatGranularity;
  step: number;
  minutes: number;
}

export function resolveRange(range: string | null | undefined): ResolvedRange {
  const spec = RANGES[range ?? 'LAST_24_HOURS'];
  if (!spec) {
    throw new GraphQLError('Unknown range.', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const unit = spec.granularity === 'MINUTE' ? MINUTE_MS : HOUR_MS;
  const from = Math.floor((Date.now() - spec.ms) / unit) * unit;
  return { from: new Date(from), granularity: spec.granularity, step: spec.step, minutes: spec.ms / MINUTE_MS };
}

export interface Counts {
  requests: number;
  errors: number;
  cached: number;
  executed: number;
  duration_total_ms: number;
  duration_max_ms: number;
  parse_total_ms: number;
  validate_total_ms: number;
  execute_total_ms: number;
  last_seen_at: Date | null;
}

const COUNT_FIELDS = {
  requests: { $sum: '$requests' },
  errors: { $sum: '$errors' },
  cached: { $sum: '$cached' },
  executed: { $sum: '$executed' },
  duration_total_ms: { $sum: '$duration_total_ms' },
  duration_max_ms: { $max: '$duration_max_ms' },
  parse_total_ms: { $sum: '$parse_total_ms' },
  validate_total_ms: { $sum: '$validate_total_ms' },
  execute_total_ms: { $sum: '$execute_total_ms' },
  last_seen_at: { $max: '$last_seen_at' },
};

export const EMPTY_COUNTS: Counts = {
  requests: 0,
  errors: 0,
  cached: 0,
  executed: 0,
  duration_total_ms: 0,
  duration_max_ms: 0,
  parse_total_ms: 0,
  validate_total_ms: 0,
  execute_total_ms: 0,
  last_seen_at: null,
};

/** The time bin a rollup falls in, as epoch milliseconds. */
export const binOf = (step: number) => ({
  $subtract: [{ $toLong: '$bucket_start' }, { $mod: [{ $toLong: '$bucket_start' }, step] }],
});

export function statMatch(range: ResolvedRange, opKey?: { $ne: string } | string): Record<string, unknown> {
  const match: Record<string, unknown> = { granularity: range.granularity, bucket_start: { $gte: range.from } };
  if (opKey !== undefined) match.op_key = opKey;
  return match;
}

/** Summed counters per group key. */
export async function countsBy(match: Record<string, unknown>, group: unknown): Promise<Map<string, Counts>> {
  const rows = await GraphqlOperationStatModel.aggregate<Counts & { _id: unknown }>([
    { $match: match },
    { $group: { _id: group, ...COUNT_FIELDS } },
  ]);
  return new Map(rows.map(({ _id, ...counts }) => [String(_id), counts]));
}

/** Summed latency histogram per group key. */
export async function histogramsBy(match: Record<string, unknown>, group: unknown): Promise<Map<string, Histogram>> {
  const pipeline: PipelineStage[] = [
    { $match: match },
    { $project: { g: group, h: { $objectToArray: '$hist' } } },
    { $unwind: '$h' },
    { $group: { _id: { g: '$g', k: '$h.k' }, n: { $sum: '$h.v' } } },
  ];
  const rows = await GraphqlOperationStatModel.aggregate<{ _id: { g: unknown; k: string }; n: number }>(pipeline);
  const out = new Map<string, Histogram>();
  for (const row of rows) {
    const key = String(row._id.g);
    const histogram = out.get(key) ?? {};
    mergeHistogram(histogram, { [row._id.k]: row.n });
    out.set(key, histogram);
  }
  return out;
}

/** How often each key of a counted map (clients, error codes) occurred, largest first. */
export async function tally(match: Record<string, unknown>, field: 'clients' | 'error_codes') {
  const rows = await GraphqlOperationStatModel.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $project: { t: { $objectToArray: `$${field}` } } },
    { $unwind: '$t' },
    { $group: { _id: '$t.k', count: { $sum: '$t.v' } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);
  return rows.map((row) => ({ label: row._id, count: row.count }));
}

const pct = (part: number, whole: number) => (whole > 0 ? round1((part / whole) * 100) : 0);
const avg = (total: number, count: number) => (count > 0 ? round1(total / count) : 0);

/** The numbers every operation row and KPI strip shows. */
export function summarize(counts: Counts, histogram: Histogram, minutes: number) {
  const max = counts.duration_max_ms;
  return {
    requests: counts.requests,
    errors: counts.errors,
    cached: counts.cached,
    error_rate_pct: pct(counts.errors, counts.requests),
    rpm: minutes > 0 ? round1(counts.requests / minutes) : 0,
    avg_ms: avg(counts.duration_total_ms, counts.requests),
    p50_ms: percentileMs(histogram, 50, max),
    p90_ms: percentileMs(histogram, 90, max),
    p95_ms: percentileMs(histogram, 95, max),
    p99_ms: percentileMs(histogram, 99, max),
    max_ms: round1(max),
    parse_avg_ms: avg(counts.parse_total_ms, counts.requests),
    validate_avg_ms: avg(counts.validate_total_ms, counts.requests),
    execute_avg_ms: avg(counts.execute_total_ms, counts.executed),
    last_seen_at: counts.last_seen_at ? counts.last_seen_at.toISOString() : null,
  };
}

/** Requests, errors and latency per time bin, with empty bins filled in so a chart has no gaps. */
export async function series(range: ResolvedRange, opKey: string) {
  const match = statMatch(range, opKey);
  const [counts, histograms] = await Promise.all([
    countsBy(match, binOf(range.step)),
    histogramsBy(match, binOf(range.step)),
  ]);
  const points = [];
  const first = Math.floor(range.from.getTime() / range.step) * range.step;
  for (let bin = first; bin <= Date.now(); bin += range.step) {
    const c = counts.get(String(bin)) ?? EMPTY_COUNTS;
    const h = histograms.get(String(bin)) ?? {};
    points.push({
      at: new Date(bin).toISOString(),
      requests: c.requests,
      errors: c.errors,
      p50_ms: percentileMs(h, 50, c.duration_max_ms),
      p95_ms: percentileMs(h, 95, c.duration_max_ms),
      p99_ms: percentileMs(h, 99, c.duration_max_ms),
    });
  }
  return points;
}
