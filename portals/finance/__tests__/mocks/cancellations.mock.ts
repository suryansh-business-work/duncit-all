import type { MockedResponse } from '@apollo/client/testing';
import type {
  PodCancellationRow,
  PodCancellationStats,
} from '../../src/pages/finance/cancellations-page/queries';
import {
  POD_CANCELLATIONS,
  POD_CANCELLATION_STATS,
} from '../../src/pages/finance/cancellations-page/queries';

/**
 * Cancel & Refunds mocks. The three pages fetch the row list imperatively
 * (`client.query(POD_CANCELLATIONS)`) and slice it in memory; the dashboard
 * also reads the KPI stats via `useQuery`.
 */
export type PodCancellationRowMock = { __typename?: 'PodCancellation' } & PodCancellationRow;

export const makeCancellationRow = (
  over: Partial<PodCancellationRow> = {},
): PodCancellationRowMock => ({
  __typename: 'PodCancellation',
  pod_id: 'p1',
  pod_slug: 'sunset-yoga',
  pod_title: 'Sunset Yoga',
  kind: 'HOST',
  reason: 'Event cancelled — rain',
  actor_name: 'Hema Kaur',
  cancelled_at: '2026-07-20T12:00:00.000Z',
  pod_date_time: '2026-08-10T18:00:00.000Z',
  pod_amount: 500,
  attendee_count: 4,
  refunded_count: 2,
  refunded_total: 250,
  unrefunded_count: 1,
  unrefunded_total: 200,
  venue_id: 'v1',
  venue_name: 'Blue Hall',
  venue_amount: 1200,
  host_names: ['Hema Kaur'],
  club_id: 'c1',
  currency_symbol: '₹',
  ...over,
});

export const makeVenueDeclineRow = (
  over: Partial<PodCancellationRow> = {},
): PodCancellationRowMock =>
  makeCancellationRow({
    pod_id: 'p2',
    pod_slug: 'book-club',
    pod_title: 'Book Club',
    kind: 'VENUE',
    reason: 'Double booking',
    actor_name: 'Venue Owner',
    refunded_count: 0,
    refunded_total: 0,
    unrefunded_count: 0,
    unrefunded_total: 0,
    venue_id: null,
    venue_name: null,
    venue_amount: 0,
    ...over,
  });

export const podCancellationsMock = (
  kind: string | null,
  rows: PodCancellationRowMock[],
): MockedResponse => ({
  request: { query: POD_CANCELLATIONS, variables: { kind } },
  result: { data: { podCancellations: rows } },
  maxUsageCount: 20,
});

export const makeCancellationStats = (
  over: Partial<PodCancellationStats> = {},
): { __typename: 'PodCancellationStats' } & PodCancellationStats => ({
  __typename: 'PodCancellationStats',
  total_cancelled: 6,
  cancelled_by_host: 3,
  cancelled_by_venue: 2,
  cancelled_by_admin: 1,
  cancelled_by_club_admin: 0,
  total_refund_amount: 1250,
  refunded_payment_count: 5,
  currency_symbol: '₹',
  ...over,
});

export const cancellationStatsMock = (
  stats = makeCancellationStats(),
): MockedResponse => ({
  request: { query: POD_CANCELLATION_STATS },
  result: { data: { podCancellationStats: stats } },
  maxUsageCount: 20,
});

export const cancellationStatsErrorMock = (): MockedResponse => ({
  request: { query: POD_CANCELLATION_STATS },
  error: new Error('stats unavailable'),
});
