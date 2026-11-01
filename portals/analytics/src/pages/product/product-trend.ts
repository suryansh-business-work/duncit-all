import type { AnalyticsGranularity, AnalyticsTrend } from '@duncit/gql-types';

/** Two aligned series as the shape the console's TrendChart draws. */
export function countTrend(
  key: string,
  buckets: readonly string[],
  series: ReadonlyArray<{ key: string; values: readonly number[] }>,
  granularity: AnalyticsGranularity = 'DAY'
): AnalyticsTrend {
  return {
    key,
    format: 'COUNT',
    granularity,
    buckets: [...buckets],
    series: series.map((one) => ({ key: one.key, values: [...one.values] })),
    url: null,
  };
}
