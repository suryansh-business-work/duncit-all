import type { MockedResponse } from '@apollo/client/testing';
import type { PodFinanceWaterfall, PodReleaseRow } from '../../src/pages/finance/pod-finance-page/queries';
import {
  POD_FINANCE_BREAKDOWN,
  POD_FINANCE_RELEASES,
} from '../../src/pages/finance/pod-finance-page/queries';

/**
 * Pod-finance mocks. The list page fetches flat release rows imperatively
 * (`client.query(POD_FINANCE_RELEASES)`) and groups them in memory; the detail
 * page reads a waterfall breakdown via `useQuery`. Every node carries
 * `__typename` for the Apollo cache.
 */
export type PodReleaseRowMock = { __typename?: 'PaymentReleaseRequest' } & PodReleaseRow;

export const makePodRelease = (over: Partial<PodReleaseRow> = {}): PodReleaseRowMock => ({
  __typename: 'PaymentReleaseRequest',
  id: '1',
  pod_id: 'p1',
  pod_title: 'Alpha',
  kind: 'HOST_PAYMENT',
  status: 'PENDING',
  amount_requested: 100,
  requested_at: '2024-02-01',
  ...over,
});

export const defaultReleases = (): PodReleaseRowMock[] => [
  makePodRelease(),
  makePodRelease({ id: '2', kind: 'VENUE_BILLING', status: 'APPROVED', amount_requested: 50, requested_at: '2024-01-01' }),
  makePodRelease({ id: '3', pod_id: 'p2', pod_title: 'Beta', amount_requested: 0, requested_at: 'bad-date' }),
];

export const podFinanceReleasesMock = (
  releases: PodReleaseRowMock[] | null = defaultReleases(),
  symbol: string | null = '₹',
): MockedResponse => ({
  request: { query: POD_FINANCE_RELEASES },
  result: {
    data: {
      paymentReleaseRequests: releases,
      publicFinanceSettings:
        symbol === null ? null : { __typename: 'PublicFinanceSettings', currency_symbol: symbol },
    },
  },
  maxUsageCount: 20,
});

/* ---- Detail ---- */

export type WaterfallMock = { __typename?: 'PodFinanceWaterfall' } & PodFinanceWaterfall;

export const makeWaterfall = (over: Partial<PodFinanceWaterfall> = {}): WaterfallMock => ({
  __typename: 'PodFinanceWaterfall',
  version: 2,
  amount: 1000,
  gst_pct: 18,
  gst_amount: 150,
  net_amount: 850,
  platform_fee_pct: 5,
  platform_fee_amount: 42,
  pool_amount: 808,
  venue_amount: 400,
  venue_commission_pct: 10,
  venue_commission_amount: 40,
  venue_receives: 360,
  host_amount: 408,
  host_commission_pct: 10,
  host_commission_amount: 40,
  host_receives: 368,
  duncit_revenue: 122,
  host_earn_pct: 36.8,
  ...over,
});

interface BreakdownMock {
  __typename?: 'PodFinanceBreakdown';
  pod_id: string;
  pod_title: string;
  settlement_status: string;
  frozen: boolean;
  bookings_count: number;
  collected_total: number;
  currency_symbol: string;
  has_venue: boolean;
  completed_at: string | null;
  waterfall: WaterfallMock;
}

export const makePodBreakdown = (over: Partial<BreakdownMock> = {}): BreakdownMock => ({
  __typename: 'PodFinanceBreakdown',
  pod_id: 'pod1',
  pod_title: 'Yoga',
  settlement_status: 'SETTLED',
  frozen: true,
  bookings_count: 10,
  collected_total: 1000,
  currency_symbol: '₹',
  has_venue: true,
  completed_at: '2024-01-05T00:00:00Z',
  waterfall: makeWaterfall(),
  ...over,
});

export const podBreakdownMock = (
  breakdown: BreakdownMock | null = makePodBreakdown(),
  podId = 'pod1',
): MockedResponse => ({
  request: { query: POD_FINANCE_BREAKDOWN, variables: { podId } },
  result: { data: { podFinanceBreakdown: breakdown } },
  maxUsageCount: 20,
});

export const podBreakdownLoadingMock = (podId = 'pod1'): MockedResponse => ({
  request: { query: POD_FINANCE_BREAKDOWN, variables: { podId } },
  result: { data: { podFinanceBreakdown: makePodBreakdown() } },
  delay: 60_000,
});
