import {
  ALL_OPERATIONS_KEY,
  GraphqlOperationModel,
  GraphqlOperationStatModel,
} from '@modules/platform/graphqlMonitor/graphqlMonitor.model';
import {
  distribution,
  mergeHistogram,
  percentileMs,
  type Histogram,
} from '@modules/platform/graphqlMonitor/graphqlMonitor.histogram';
import {
  EMPTY_COUNTS,
  countsBy,
  histogramsBy,
  summarize,
  tally as countedKeys,
  type Counts,
} from '@modules/platform/graphqlMonitor/graphqlMonitor.query';
import { RateLimitEventModel } from '@modules/platform/rateLimit/rateLimit.model';
import { bucketOfDay, dayKeyExpr, inEitherPeriod, inRange, type AnalyticsWindow } from './window';
import { fixedSlices, type AnalyticsSlice } from './shapes';

/**
 * What the API performance analytics page reads: the GraphQL Monitor's rollups
 * and the rate limiter's breach log.
 *
 * Only the monitor's HOURLY rollups are read — its minute rows live two days
 * and the shortest window here is a week. Every percentile is read off a summed
 * histogram with the monitor's own functions, never averaged, because the p95
 * of two days is not the mean of their p95s. The rollups expire after the
 * monitor's retention (Tech > GraphQL Monitor > Settings, 14 days unless
 * changed), so a longer window simply reads what is still stored.
 */

const MINUTES_PER_DAY = 1440;

export const hourMatch = (from: Date, to: Date, opKey: string | { $ne: string }) => ({
  granularity: 'HOUR',
  op_key: opKey,
  bucket_start: inRange(from, to),
});

export type ApiSummary = ReturnType<typeof summarize>;

/** Every operation together over one period, plus the latency histogram behind its percentiles. */
export async function apiTotals(from: Date, to: Date, days: number) {
  const match = hourMatch(from, to, ALL_OPERATIONS_KEY);
  const [counts, histograms] = await Promise.all([countsBy(match, null), histogramsBy(match, null)]);
  const histogram = histograms.get('null') ?? {};
  return { summary: summarize(counts.get('null') ?? EMPTY_COUNTS, histogram, days * MINUTES_PER_DAY), histogram };
}

/** How many different operations were called in a period. */
export const operationCount = async (from: Date, to: Date) =>
  (await GraphqlOperationStatModel.distinct('op_key', hourMatch(from, to, { $ne: ALL_OPERATIONS_KEY }))).length;

interface BucketTotals {
  requests: number;
  errors: number;
  max: number;
  histogram: Histogram;
}

/** Requests, failures and latency per chart bucket — each bucket's percentiles read off its own summed histogram. */
export async function apiSeries(window: AnalyticsWindow) {
  const match = hourMatch(window.from, window.to, ALL_OPERATIONS_KEY);
  const day = dayKeyExpr('bucket_start', window.zone);
  const [counts, histograms] = await Promise.all([countsBy(match, day), histogramsBy(match, day)]);
  const buckets = new Map<string, BucketTotals>();
  const bucketOf = (dayKey: string) => {
    const key = bucketOfDay(dayKey, window.granularity);
    const found = buckets.get(key) ?? { requests: 0, errors: 0, max: 0, histogram: {} };
    buckets.set(key, found);
    return found;
  };
  for (const [dayKey, counted] of counts) addCounts(bucketOf(dayKey), counted);
  for (const [dayKey, histogram] of histograms) mergeHistogram(bucketOf(dayKey).histogram, histogram);
  const read = (value: (totals: BucketTotals) => number) =>
    window.buckets.map((key) => {
      const totals = buckets.get(key);
      return totals ? value(totals) : 0;
    });
  const percentile = (p: number) => read((totals) => percentileMs(totals.histogram, p, totals.max));
  return {
    requests: read((totals) => totals.requests),
    errors: read((totals) => totals.errors),
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
}

function addCounts(into: BucketTotals, counted: Counts): void {
  into.requests += counted.requests;
  into.errors += counted.errors;
  into.max = Math.max(into.max, counted.duration_max_ms);
}

export type OperationStats = ApiSummary & { id: string; name: string; type: string | null };

/** Each operation's numbers over the window, named from the monitor's operation registry. */
export async function operationStats(window: AnalyticsWindow): Promise<OperationStats[]> {
  const match = hourMatch(window.from, window.to, { $ne: ALL_OPERATIONS_KEY });
  const [counts, histograms] = await Promise.all([countsBy(match, '$op_key'), histogramsBy(match, '$op_key')]);
  const registry = await GraphqlOperationModel.find({ op_key: { $in: [...counts.keys()] } })
    .select('op_key name type')
    .lean();
  const known = new Map(registry.map((doc) => [doc.op_key, doc]));
  return [...counts.entries()].map(([opKey, counted]) => ({
    id: opKey,
    // The registry row expires with the retention; the key still identifies the operation.
    name: known.get(opKey)?.name ?? opKey,
    type: known.get(opKey)?.type ?? null,
    ...summarize(counted, histograms.get(opKey) ?? {}, window.days * MINUTES_PER_DAY),
  }));
}

/** Error codes or calling clients, counted across every operation in the window. */
export const countedOver = (window: AnalyticsWindow, field: 'clients' | 'error_codes') =>
  countedKeys(hourMatch(window.from, window.to, ALL_OPERATIONS_KEY), field);

/** Upper bound (inclusive) of each latency band, in milliseconds. */
const LATENCY_BANDS = [
  { key: 'lat_under_100', max: 100 },
  { key: 'lat_100_300', max: 300 },
  { key: 'lat_300_1000', max: 1000 },
  { key: 'lat_1000_3000', max: 3000 },
  { key: 'lat_over_3000', max: Number.POSITIVE_INFINITY },
];

/**
 * Requests per latency band. A histogram bucket is filed by its upper edge, so
 * a band boundary is accurate to within one bucket (about 20%).
 */
export function latencyBands(histogram: Histogram): AnalyticsSlice[] {
  const counts = new Map<string, number>();
  for (const { le_ms: upper, count } of distribution(histogram)) {
    const band = LATENCY_BANDS.find((candidate) => upper <= candidate.max);
    if (band) counts.set(band.key, (counts.get(band.key) ?? 0) + count);
  }
  return fixedSlices(
    LATENCY_BANDS.map((band) => band.key),
    counts
  );
}

export interface BreachDay {
  _id: { day: string; mode: string; period: string };
  count: number;
}

/**
 * Rate-limit breaches per day, mode and period. The limiter records one event
 * per rule and caller every ten seconds at most, so these count breach events,
 * not every refused request.
 */
export const breachDays = (window: AnalyticsWindow) =>
  RateLimitEventModel.aggregate<BreachDay>([
    { $match: inEitherPeriod('created_at', window) },
    {
      $group: {
        _id: {
          day: dayKeyExpr('created_at', window.zone),
          mode: '$mode',
          period: { $cond: [{ $gte: ['$created_at', window.from] }, 'now', 'before'] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

/** The callers refused most often in the window, by the counter key that overflowed (`ip:…`, `user:…`). */
export const topBlockedCallers = (window: AnalyticsWindow) =>
  RateLimitEventModel.aggregate<{ _id: string; count: number }>([
    { $match: { created_at: inRange(window.from, window.to), mode: 'ENFORCE' } },
    { $group: { _id: '$limit_key', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 10 },
  ]);
