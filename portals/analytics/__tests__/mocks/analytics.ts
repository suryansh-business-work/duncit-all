import { ANALYTICS_BUNDLE, flattenCatalogue } from '@duncit/app-settings';
import type {
  AnalyticsBreakdown,
  AnalyticsKpi,
  AnalyticsLeaderboard,
  AnalyticsTrend,
  EntityAnalytics,
} from '../../src/pages/entity-analytics/queries';

/** The console's shipped copy, to read the words a key should render as. */
export const COPY = flattenCatalogue(ANALYTICS_BUNDLE);

export const kpi = (over: Partial<AnalyticsKpi> = {}): AnalyticsKpi => ({
  __typename: 'AnalyticsKpi',
  key: 'pods_held',
  value: 128,
  previous: 104,
  format: 'COUNT',
  higher_is_better: true,
  ...over,
});

export const trend = (over: Partial<AnalyticsTrend> = {}): AnalyticsTrend => ({
  __typename: 'AnalyticsTrend',
  key: 'revenue',
  format: 'CURRENCY',
  granularity: 'DAY',
  buckets: ['2026-09-15', '2026-09-16', '2026-09-17'],
  series: [{ __typename: 'AnalyticsSeries', key: 'revenue', values: [42000, 0, 185000] }],
  ...over,
});

export const breakdown = (over: Partial<AnalyticsBreakdown> = {}): AnalyticsBreakdown => ({
  __typename: 'AnalyticsBreakdown',
  key: 'pods_by_city',
  format: 'COUNT',
  scope: 'WINDOW',
  ordered: false,
  slices: [
    { __typename: 'AnalyticsSlice', key: 'loc-mys', label: 'Mysuru', value: 5 },
    { __typename: 'AnalyticsSlice', key: 'loc-blr', label: 'Bengaluru', value: 48 },
    { __typename: 'AnalyticsSlice', key: 'loc-hyd', label: 'Hyderabad', value: 17 },
  ],
  ...over,
});

export const leaderboard = (over: Partial<AnalyticsLeaderboard> = {}): AnalyticsLeaderboard => ({
  __typename: 'AnalyticsLeaderboard',
  key: 'top_clubs',
  columns: [
    { __typename: 'AnalyticsColumn', key: 'pods_held', format: 'COUNT' },
    { __typename: 'AnalyticsColumn', key: 'revenue', format: 'CURRENCY' },
    { __typename: 'AnalyticsColumn', key: 'avg_rating', format: 'RATING' },
  ],
  rows: [
    {
      __typename: 'AnalyticsLeaderRow',
      id: 'club-doc-1',
      name: 'Koramangala Runners',
      caption: 'Bengaluru',
      values: [14, 250000, null],
    },
    {
      __typename: 'AnalyticsLeaderRow',
      id: 'club-doc-2',
      name: 'HSR Book Circle',
      caption: null,
      values: [9, 1200, 4.62],
    },
  ],
  ...over,
});

export const board = (over: Partial<EntityAnalytics> = {}): EntityAnalytics => ({
  __typename: 'EntityAnalytics',
  entity: 'PODS',
  period: { __typename: 'AnalyticsPeriod', days: 30, from: '2026-08-19', to: '2026-09-17', granularity: 'DAY' },
  kpis: [
    kpi(),
    kpi({ key: 'fill_rate', value: 68.4, previous: 61.2, format: 'PERCENT' }),
    kpi({ key: 'revenue', value: 150000, previous: 200000, format: 'CURRENCY' }),
    kpi({ key: 'avg_rating', value: 4.4, previous: 4.4, format: 'RATING' }),
    kpi({ key: 'cancellation_rate', value: 6, previous: 4, format: 'PERCENT', higher_is_better: false }),
  ],
  trends: [
    trend({ key: 'pods', series: [
      { __typename: 'AnalyticsSeries', key: 'pods_held', values: [4, 6, 5] },
      { __typename: 'AnalyticsSeries', key: 'pods_cancelled', values: [0, 1, 0] },
    ] }),
    trend({ key: 'bookings', granularity: 'WEEK' }),
    trend(),
  ],
  breakdowns: [
    breakdown(),
    breakdown({ key: 'weekday', ordered: true, slices: [] }),
    breakdown({ key: 'fill_band', ordered: true, scope: 'ALL_TIME', slices: [] }),
    breakdown({ key: 'hour_of_day', ordered: true, slices: [] }),
  ],
  leaderboard: leaderboard(),
  ...over,
});
