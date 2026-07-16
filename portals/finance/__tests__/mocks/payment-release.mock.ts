import type { MockedResponse } from '@apollo/client/testing';
import type { PaymentReleaseRow } from '../../src/pages/finance/payment-release-page/queries';
import {
  PUBLIC_FINANCE_SETTINGS,
  REVIEW_PAYMENT_RELEASE,
} from '../../src/pages/finance/payment-release-page/queries';

/**
 * Payment-release mocks. Table rows (with their settlement breakdown) feed the
 * stubbed `@duncit/table` via `tableControls`; the currency settings + review
 * mutation flow through `MockedProvider`.
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

export type ReleaseRowMock = { __typename?: 'PaymentReleaseRequest' } & PaymentReleaseRow & {
  breakdown: BreakdownV1Mock | BreakdownV2Mock;
};

export const makeReleaseRow = (over: Partial<ReleaseRowMock> = {}): ReleaseRowMock => ({
  __typename: 'PaymentReleaseRequest',
  id: 'rel1',
  release_id: 'REL-1',
  kind: 'VENUE_BILLING',
  status: 'PENDING',
  pod_id: 'pod1',
  pod_title: 'Yoga',
  beneficiary_name: 'Venue Co',
  beneficiary_email: 'v@x.com',
  amount_requested: 1000,
  bill_url: 'https://bill',
  evidence_media: [{ url: 'm', type: 'IMAGE' }],
  notes: 'note',
  requested_at: '2024-01-01T00:00:00Z',
  breakdown: makeBreakdownV2(),
  ...over,
});

export const makeApprovedReleaseRow = (): ReleaseRowMock =>
  makeReleaseRow({
    id: 'rel2',
    release_id: 'REL-2',
    kind: 'HOST_PAYMENT',
    status: 'APPROVED',
    pod_id: 'pod2',
    pod_title: 'Chess',
    beneficiary_name: 'Host',
    beneficiary_email: 'h@x.com',
    amount_requested: 0,
    bill_url: null,
    evidence_media: null,
    notes: null,
    requested_at: 'bad-date',
    breakdown: makeBreakdownV1(),
  });

const settings = (symbol: string | null) => ({
  request: { query: PUBLIC_FINANCE_SETTINGS },
  result: {
    data: {
      publicFinanceSettings:
        symbol === null ? null : { __typename: 'PublicFinanceSettings', currency_symbol: symbol },
    },
  },
  maxUsageCount: 20,
});

export const publicFinanceSettingsMock = (symbol = '₹'): MockedResponse => settings(symbol);
export const publicFinanceSettingsNullMock = (): MockedResponse => settings(null);

export const reviewPaymentReleaseMock = (
  over: { fail?: boolean; delay?: number } = {},
): MockedResponse => ({
  request: { query: REVIEW_PAYMENT_RELEASE },
  variableMatcher: () => true,
  ...(over.delay ? { delay: over.delay } : {}),
  ...(over.fail
    ? { error: new Error('review failed') }
    : {
        result: {
          data: {
            reviewPaymentReleaseRequest: {
              __typename: 'PaymentReleaseRequest',
              id: 'rel1',
              status: 'APPROVED',
              approval_type: 'FULL',
              approved_amount: 1000,
              approval_reason: '',
              reviewed_at: '2024-01-02T00:00:00Z',
            },
          },
        },
      }),
  maxUsageCount: 20,
});
