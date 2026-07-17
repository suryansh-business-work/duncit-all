import type { MockedResponse } from '@apollo/client/testing';
import type { AdsDashboard } from '@duncit/gql-types';
import { MY_ADS_DASHBOARD } from '../../src/pages/dashboard/queries';

/**
 * Advertiser dashboard KPIs. Typed against the generated `AdsDashboard` schema
 * type (assignable to the app's `AdsDashboardStats`), carrying
 * `__typename: 'AdsDashboard'` so the `MockedProvider` cache matches production.
 */
export const makeAdsDashboard = (over: Partial<AdsDashboard> = {}): AdsDashboard => ({
  __typename: 'AdsDashboard',
  total: 5,
  pending: 1,
  approved: 1,
  live: 2,
  rejected: 0,
  expired: 1,
  total_estimated_cost: 20000,
  total_approved_cost: 18000,
  live_spend: 6000,
  next_start_at: '2026-08-01T09:00:00.000Z',
  next_start_title: 'Diwali Blast',
  currency_symbol: '₹',
  ...over,
});

export const myAdsDashboardMock = (
  stats: AdsDashboard | null = makeAdsDashboard(),
): MockedResponse => ({
  request: { query: MY_ADS_DASHBOARD },
  result: { data: { myAdsDashboard: stats } },
  maxUsageCount: 20,
});
