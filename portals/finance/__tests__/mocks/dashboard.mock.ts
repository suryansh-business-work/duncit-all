import type { MockedResponse } from '@apollo/client/testing';
import type { FinanceDashboardStats, FinanceStat } from '@duncit/gql-types';
import { FINANCE_DASHBOARD_STATS } from '../../src/pages/finance/dashboard/queries';

/**
 * Finance dashboard KPI mocks. Every object is a fully-typed slice of the
 * generated `@duncit/gql-types` schema (each carries `__typename`), so the
 * `MockedProvider` cache is satisfied with no missing-field / `addTypename`
 * warnings.
 */
export const makeFinanceStat = (over: Partial<FinanceStat> = {}): FinanceStat => ({
  __typename: 'FinanceStat',
  total: 1000,
  this_month: 500,
  last_month: 450,
  mom_change_pct: 5,
  ...over,
});

/**
 * A complete dashboard: total_revenue trends up (+5), duncit_revenue down (-3),
 * gst flat (0) — exercising both trend signs and the up/down colour branches.
 */
export const makeFinanceDashboardStats = (
  over: Partial<FinanceDashboardStats> = {},
): FinanceDashboardStats => ({
  __typename: 'FinanceDashboardStats',
  currency_symbol: '₹',
  total_revenue: makeFinanceStat({ total: 1000, mom_change_pct: 5 }),
  duncit_revenue: makeFinanceStat({ total: 500, mom_change_pct: -3 }),
  gst_collected: makeFinanceStat({ total: 100, mom_change_pct: 0 }),
  pending_payouts: makeFinanceStat({ total: 200, mom_change_pct: 2 }),
  completed_payouts: makeFinanceStat({ total: 800, mom_change_pct: 1 }),
  ...over,
});

export const financeDashboardStatsMock = (
  stats: FinanceDashboardStats = makeFinanceDashboardStats(),
): MockedResponse => ({
  request: { query: FINANCE_DASHBOARD_STATS },
  result: { data: { financeDashboardStats: stats } },
  maxUsageCount: 20,
});

/** Query that never resolves — keeps the KPIs in their loading/no-data state. */
export const financeDashboardLoadingMock = (): MockedResponse => ({
  request: { query: FINANCE_DASHBOARD_STATS },
  result: { data: { financeDashboardStats: makeFinanceDashboardStats() } },
  delay: 60_000,
});

export const financeDashboardErrorMock = (): MockedResponse => ({
  request: { query: FINANCE_DASHBOARD_STATS },
  error: new Error('boom'),
});
