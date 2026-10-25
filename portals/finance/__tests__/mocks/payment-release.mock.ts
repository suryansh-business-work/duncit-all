import type { MockedResponse } from '@apollo/client/testing';
import type {
  PaymentReleaseRow,
  PodPaymentReleaseDetail,
  PodPaymentReleaseRow,
  ReleaseBreakdown,
} from '../../src/pages/finance/payment-release-page/queries';
import {
  APPROVE_POD_PAYMENT_RELEASE,
  POD_COIN_TOTALS,
  POD_PAYMENT_RELEASE,
  PUBLIC_FINANCE_SETTINGS,
  REVIEW_PAYMENT_RELEASE,
} from '../../src/pages/finance/payment-release-page/queries';

/**
 * Payment-release mocks. The list is one row per pod request, fed to the
 * stubbed `@duncit/table` via `tableControls`; one request's detail (every
 * payout on it, each with its settlement breakdown), the currency settings and
 * the two decisions — review one payout, approve them all — flow through
 * `MockedProvider`.
 */
export interface BreakdownV2Mock {
  __typename?: 'PaymentReleaseBreakdown';
  version: 2;
  collected_total: number;
  gst_pct: number;
  gst_amount: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  pool_amount: number;
  share_amount: number;
  commission_pct: number;
  commission_amount: number;
  payout_amount: number;
  duncit_revenue: number;
  /** Frozen at completion: what the pod settled on (0 booked = no attendance lines). */
  booked_seats: number;
  attended_seats: number;
  attended_total: number;
}

export interface BreakdownV1Mock {
  __typename?: 'PaymentReleaseBreakdown';
  version: 1;
  collected_total: number;
  venue_bill: number;
  gst_pct: number;
  gst_amount: number;
  duncit_pct: number;
  duncit_amount: number;
  payout_pct: number;
  payout_amount: number;
}

export const makeBreakdownV2 = (over: Partial<BreakdownV2Mock> = {}): BreakdownV2Mock => ({
  __typename: 'PaymentReleaseBreakdown',
  version: 2,
  collected_total: 1000,
  gst_pct: 18,
  gst_amount: 150,
  platform_fee_pct: 5,
  platform_fee_amount: 40,
  pool_amount: 810,
  share_amount: 400,
  commission_pct: 10,
  commission_amount: 40,
  payout_amount: 360,
  duncit_revenue: 120,
  booked_seats: 0,
  attended_seats: 0,
  attended_total: 0,
  ...over,
});

export const makeBreakdownV1 = (over: Partial<BreakdownV1Mock> = {}): BreakdownV1Mock => ({
  __typename: 'PaymentReleaseBreakdown',
  version: 1,
  collected_total: 1000,
  venue_bill: 400,
  gst_pct: 18,
  gst_amount: 150,
  duncit_pct: 10,
  duncit_amount: 100,
  payout_pct: 50,
  payout_amount: 350,
  ...over,
});

/* ---- List: one row per pod request ---- */

export type PodPaymentReleaseMock = { __typename?: 'PodPaymentRelease' } & PodPaymentReleaseRow;

/** "Yoga": a venue pod whose request carries a bill and three media files. */
export const makePodPaymentRelease = (over: Partial<PodPaymentReleaseRow> = {}): PodPaymentReleaseMock => ({
  __typename: 'PodPaymentRelease',
  id: 'batch-1',
  pod_id: 'pod1',
  pod_title: 'Yoga',
  status: 'PENDING',
  total_requested: 1040.5,
  release_count: 3,
  kinds: ['VENUE_BILLING', 'HOST_PAYMENT', 'CLUB_ADMIN'],
  has_bill: true,
  media_count: 3,
  requested_at: '2024-01-01T00:00:00Z',
  ...over,
});

/* ---- Detail: one request with every payout on it ---- */

/** Every field the detail query selects on a breakdown — v1-only ones are null on a v2 snapshot. */
export interface DetailBreakdownMock extends ReleaseBreakdown {
  __typename?: 'PaymentReleaseBreakdown';
  collected_total: number;
  gst_pct: number;
  gst_amount: number;
  duncit_pct: number | null;
  duncit_amount: number | null;
  payout_pct: number | null;
  payout_amount: number;
  net_amount: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  pool_amount: number;
  commission_pct: number;
  commission_amount: number;
  duncit_revenue: number;
  attended_total: number;
}

/**
 * The frozen snapshot every payout of one completion carries: 8 of 10 seats
 * came, the slot was booked at ₹300 and a ₹450 bill is paid on top of it.
 * `share_amount` is the payout's own side — ₹750 on the venue's release.
 */
export const makeDetailBreakdown = (over: Partial<DetailBreakdownMock> = {}): DetailBreakdownMock => ({
  __typename: 'PaymentReleaseBreakdown',
  version: 2,
  collected_total: 2000,
  venue_bill: 450,
  gst_pct: 18,
  gst_amount: 305.08,
  duncit_pct: null,
  duncit_amount: null,
  payout_pct: null,
  payout_amount: 675,
  net_amount: 1694.92,
  platform_fee_pct: 5,
  platform_fee_amount: 84.75,
  pool_amount: 1610.17,
  share_amount: 750,
  commission_pct: 10,
  commission_amount: 75,
  duncit_revenue: 500,
  attended_seats: 8,
  booked_seats: 10,
  attended_total: 2000,
  venue_slot_price: 300,
  include_slot_price: true,
  // A booking from before offers: no extra charges, no minimum, no agreed terms.
  venue_extra_amount: 0,
  venue_min_guests: 0,
  venue_pax: 0,
  venue_agreed_model: null,
  venue_agreed_rate: null,
  ...over,
});

export type DetailReleaseMock = { __typename?: 'PaymentReleaseRequest' } & Omit<PaymentReleaseRow, 'breakdown'> & {
    approval_type: 'FULL' | 'PARTIAL' | null;
    approved_amount: number | null;
    approval_reason: string | null;
    reviewed_at: string | null;
    breakdown: DetailBreakdownMock | null;
  };

const BILL_URL = 'https://cdn.test/bill.pdf';
const MEDIA = [
  { __typename: 'PaymentReleaseMedia', url: 'https://cdn.test/a.jpg', type: 'IMAGE' },
  { __typename: 'PaymentReleaseMedia', url: 'https://cdn.test/clip.mp4', type: 'VIDEO' },
];

/** The venue's payout on the request — pending, with the bill behind it. */
export const makeDetailRelease = (over: Partial<DetailReleaseMock> = {}): DetailReleaseMock => ({
  __typename: 'PaymentReleaseRequest',
  id: 'rel-venue',
  release_id: 'REL-1',
  kind: 'VENUE_BILLING',
  status: 'PENDING',
  pod_id: 'pod1',
  pod_title: 'Yoga',
  beneficiary_name: 'Venue Co',
  beneficiary_email: 'v@x.com',
  amount_requested: 675,
  bill_url: BILL_URL,
  evidence_media: MEDIA,
  notes: 'Paid in cash',
  requested_at: '2024-01-01T00:00:00Z',
  approval_type: null,
  approved_amount: null,
  approval_reason: null,
  reviewed_at: null,
  breakdown: makeDetailBreakdown(),
  ...over,
});

/** The host's payout off the same completion: same media, same note, its own share. */
export const makeHostDetailRelease = (over: Partial<DetailReleaseMock> = {}): DetailReleaseMock =>
  makeDetailRelease({
    id: 'rel-host',
    release_id: 'REL-2',
    kind: 'HOST_PAYMENT',
    beneficiary_name: 'Host H',
    beneficiary_email: 'h@x.com',
    amount_requested: 325.5,
    bill_url: null,
    breakdown: makeDetailBreakdown({ share_amount: 361.67, commission_amount: 36.17, payout_amount: 325.5 }),
    ...over,
  });

/** The club admin's cut, already approved in full. */
export const makeClubAdminDetailRelease = (over: Partial<DetailReleaseMock> = {}): DetailReleaseMock =>
  makeDetailRelease({
    id: 'rel-club',
    release_id: 'REL-3',
    kind: 'CLUB_ADMIN',
    status: 'APPROVED',
    beneficiary_name: 'Club C',
    beneficiary_email: 'c@x.com',
    amount_requested: 40,
    bill_url: null,
    notes: null,
    approval_type: 'FULL',
    approved_amount: 40,
    reviewed_at: '2024-01-02T00:00:00Z',
    breakdown: makeDetailBreakdown({ share_amount: 40, commission_pct: 0, commission_amount: 0, payout_amount: 40 }),
    ...over,
  });

export type ReleaseDetailMock = { __typename?: 'PodPaymentReleaseDetail' } & Omit<PodPaymentReleaseDetail, 'releases'> & {
    releases: DetailReleaseMock[];
  };

/** One request: two payouts waiting (₹675 + ₹325.50) and one already paid. */
export const makeReleaseDetail = (
  releases: DetailReleaseMock[] = [makeDetailRelease(), makeHostDetailRelease(), makeClubAdminDetailRelease()],
  summary: Partial<PodPaymentReleaseRow> = {},
): ReleaseDetailMock => {
  // The detail query selects a subset of the list row's fields.
  const { kinds: _kinds, has_bill: _hasBill, media_count: _mediaCount, ...row } = makePodPaymentRelease({
    release_count: releases.length,
    ...summary,
  });
  return { __typename: 'PodPaymentReleaseDetail', summary: row, releases };
};

/** The same request once every payout on it has been approved in full. */
export const approvedDetail = (detail: ReleaseDetailMock = makeReleaseDetail()): ReleaseDetailMock => ({
  ...detail,
  summary: { ...detail.summary, status: 'APPROVED' },
  releases: detail.releases.map((release) => ({
    ...release,
    status: 'APPROVED',
    approval_type: 'FULL',
    approved_amount: release.amount_requested,
    reviewed_at: '2024-01-02T00:00:00Z',
  })),
});

const financeSettings = (symbol: string | null) =>
  symbol === null ? null : { __typename: 'PublicFinanceSettings', currency_symbol: symbol };

/**
 * The detail read. `reads` counts how many times it answered, which is how a
 * suite sees the page re-read the request after a decision.
 */
export const podPaymentReleaseMock = (
  detail: ReleaseDetailMock | null = makeReleaseDetail(),
  over: { id?: string; symbol?: string | null; uses?: number; delay?: number } = {},
) => {
  const state = { reads: 0 };
  const mock: MockedResponse = {
    request: { query: POD_PAYMENT_RELEASE, variables: { id: over.id ?? 'batch-1' } },
    ...(over.delay ? { delay: over.delay } : {}),
    result: () => {
      state.reads += 1;
      return {
        data: {
          podPaymentRelease: detail,
          publicFinanceSettings: financeSettings(over.symbol === undefined ? '₹' : over.symbol),
        },
      };
    },
    maxUsageCount: over.uses ?? 20,
  };
  return { mock, state };
};

/** The read refused by the server — a GraphQL error, the way a NOT_FOUND arrives. */
export const podPaymentReleaseErrorMock = (message: string, id = 'batch-1'): MockedResponse => ({
  request: { query: POD_PAYMENT_RELEASE, variables: { id } },
  result: { errors: [{ message } as never] },
  maxUsageCount: 20,
});

/** "Approve all payouts". `calls` holds the variables of every approval it answered. */
export const approvePodPaymentReleaseMock = (
  over: { fail?: boolean; delay?: number; result?: ReleaseDetailMock } = {},
) => {
  const calls: Record<string, unknown>[] = [];
  const mock: MockedResponse = {
    request: {
      query: APPROVE_POD_PAYMENT_RELEASE,
      variables: (variables: Record<string, unknown>) => {
        calls.push(variables);
        return true;
      },
    },
    ...(over.delay ? { delay: over.delay } : {}),
    ...(over.fail
      ? { error: new Error('approve failed') }
      : { result: { data: { approvePodPaymentRelease: over.result ?? approvedDetail() } } }),
    maxUsageCount: 20,
  };
  return { mock, calls };
};

const settings = (symbol: string | null) => ({
  request: { query: PUBLIC_FINANCE_SETTINGS },
  result: { data: { publicFinanceSettings: financeSettings(symbol) } },
  maxUsageCount: 20,
});

export const publicFinanceSettingsMock = (symbol = '₹'): MockedResponse => settings(symbol);
export const publicFinanceSettingsNullMock = (): MockedResponse => settings(null);

/** The single-payout review. `calls` holds the variables of every review it answered. */
export const reviewPaymentReleaseMock = (
  over: { fail?: boolean; delay?: number; id?: string; approved_amount?: number } = {},
) => {
  const calls: Record<string, unknown>[] = [];
  const mock: MockedResponse = {
    request: {
      query: REVIEW_PAYMENT_RELEASE,
      variables: (variables: Record<string, unknown>) => {
        calls.push(variables);
        return true;
      },
    },
    ...(over.delay ? { delay: over.delay } : {}),
    ...(over.fail
      ? { error: new Error('review failed') }
      : {
          result: {
            data: {
              reviewPaymentReleaseRequest: {
                __typename: 'PaymentReleaseRequest',
                id: over.id ?? 'rel-venue',
                status: 'APPROVED',
                approval_type: 'FULL',
                approved_amount: over.approved_amount ?? 675,
                approval_reason: '',
                reviewed_at: '2024-01-02T00:00:00Z',
              },
            },
          },
        }),
    maxUsageCount: 20,
  };
  return { mock, calls };
};

export interface PodCoinTotalsMock {
  coins_redeemed_total: number;
  coins_earned_total: number;
  ticket_discount_total: number;
}

/** The pod's live coin movement + multi-ticket discounts behind the review's explanatory notes. */
export const podCoinTotalsMock = (totals: PodCoinTotalsMock, podId = 'pod1'): MockedResponse => ({
  request: { query: POD_COIN_TOTALS, variables: { podId } },
  result: { data: { podFinanceBreakdown: { __typename: 'PodFinanceBreakdown', pod_id: podId, ...totals } } },
  maxUsageCount: 20,
});
