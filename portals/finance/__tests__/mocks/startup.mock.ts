import type { MockedResponse } from '@apollo/client/testing';
import { FOUNDER_DASHBOARD, SAVE_FOUNDER_SETTING } from '../../src/pages/finance/startup-dashboard/queries';
import type {
  FounderMetric,
  MetricPoint,
} from '../../src/pages/finance/startup-dashboard/types';

/**
 * Founder/Startup dashboard mocks. The page narrows the GraphQL `FounderMetric`
 * (String `source`, Maybe `delta_pct`) into its own strict projection in
 * `startup-dashboard/types.ts`; these factories are typed against that
 * app-level projection and add the `__typename` fields the Apollo cache needs.
 */
type MetricPointMock = MetricPoint & { __typename?: 'FounderPoint' };
export type FounderMetricMock = Omit<FounderMetric, 'series'> & {
  __typename?: 'FounderMetric';
  series: MetricPointMock[];
};

const point = (label: string, value: number): MetricPointMock => ({
  __typename: 'FounderPoint',
  label,
  value,
});

export const makeFounderMetric = (over: Partial<FounderMetric> = {}): FounderMetricMock => ({
  __typename: 'FounderMetric',
  key: 'mrr',
  category: 'Revenue',
  label: 'MRR',
  unit: 'currency',
  value: 1000,
  delta_pct: 5,
  definition: 'Monthly recurring revenue',
  formula: 'a + b',
  source: 'computed',
  setting_keys: ['a', 'b'],
  series: [point('Jan', 1), point('Feb', 3)],
  ...over,
});

interface CategoryMock {
  __typename?: 'FounderCategory';
  key: string;
  label: string;
  icon: string;
  metrics: FounderMetricMock[];
}

interface SettingMock {
  __typename?: 'FounderSettingKV';
  key: string;
  value: number;
}

interface FounderDashboardMock {
  __typename?: 'FounderDashboard';
  from: string;
  to: string;
  top: FounderMetricMock[];
  categories: CategoryMock[];
  settings: SettingMock[];
}

export const makeFounderDashboard = (
  over: Partial<FounderDashboardMock> = {},
): FounderDashboardMock => ({
  __typename: 'FounderDashboard',
  from: '2024-01-01',
  to: '2024-12-31',
  top: [makeFounderMetric()],
  categories: [
    {
      __typename: 'FounderCategory',
      key: 'ops',
      label: 'Ops',
      icon: 'insights',
      metrics: [
        makeFounderMetric({ key: 'cash', label: 'Cash', unit: 'number', source: 'manual', delta_pct: -2, setting_keys: ['a'] }),
        makeFounderMetric({ key: 'nps', label: 'NPS', unit: 'rating', delta_pct: null, setting_keys: [], series: [] }),
      ],
    },
  ],
  settings: [{ __typename: 'FounderSettingKV', key: 'a', value: 10 }],
  ...over,
});

export const founderDashboardMock = (
  dashboard: FounderDashboardMock | null = makeFounderDashboard(),
): MockedResponse => ({
  request: { query: FOUNDER_DASHBOARD },
  variableMatcher: () => true,
  result: { data: { founderDashboard: dashboard } },
  maxUsageCount: 20,
});

export const founderDashboardLoadingMock = (): MockedResponse => ({
  request: { query: FOUNDER_DASHBOARD },
  variableMatcher: () => true,
  result: { data: { founderDashboard: makeFounderDashboard() } },
  delay: 60_000,
});

export const founderDashboardErrorMock = (): MockedResponse => ({
  request: { query: FOUNDER_DASHBOARD },
  variableMatcher: () => true,
  error: new Error('boom'),
});

export const saveFounderSettingMock = (): MockedResponse => ({
  request: { query: SAVE_FOUNDER_SETTING },
  variableMatcher: () => true,
  result: { data: { saveFounderSetting: { __typename: 'FounderSettingKV', key: 'a', value: 7 } } },
  maxUsageCount: 20,
});
