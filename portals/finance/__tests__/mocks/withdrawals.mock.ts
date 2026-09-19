import type { MockedResponse } from '@apollo/client/testing';
import {
  POD_WITHDRAWAL_SUMMARY,
  REVIEW_WITHDRAWAL,
  UPDATE_WITHDRAWAL_MINIMUMS,
  WITHDRAWAL_MINIMUMS,
  type PodWithdrawalGroup,
  type WithdrawalMinimums,
  type WithdrawalRow,
} from '../../src/pages/finance/withdrawals-page/queries';

/**
 * Withdrawal Payments mocks.
 *
 * Level 1 lists the pods money was withdrawn against and level 2 lists one
 * pod's requests; both tables are fed through the stubbed `@duncit/table`
 * (`tableControls.rowsByKey`), so their rows are plain factories here. The pod
 * header, the review mutation and the settings page go through Apollo.
 */
export type WithdrawalRowMock = { __typename?: 'WalletWithdrawal' } & WithdrawalRow;

export const makeWithdrawalRow = (over: Partial<WithdrawalRow> = {}): WithdrawalRowMock => ({
  __typename: 'WalletWithdrawal',
  id: 'w1',
  withdrawal_id: 'WD-1',
  beneficiary_name: 'Host A',
  beneficiary_email: 'a@x',
  amount: 500,
  withdrawer_role: 'HOST',
  status: 'PENDING',
  payout_method: 'UPI',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: 'a@upi',
  scheduled_for: '2026-08-01T00:00:00.000Z',
  reject_reason: '',
  requested_at: '2026-07-30T10:00:00.000Z',
  allocations: [{ pod_id: 'DUN-POD-4821', amount: 500 }],
  ...over,
});

/** A bank transfer that drew on two pods' earnings, so this pod only funded part of it. */
export const makeBankWithdrawalRow = (over: Partial<WithdrawalRow> = {}): WithdrawalRowMock =>
  makeWithdrawalRow({
    id: 'w2',
    withdrawal_id: 'WD-2',
    beneficiary_name: 'Venue B',
    beneficiary_email: 'b@x',
    amount: 1500,
    withdrawer_role: 'VENUE_OWNER',
    payout_method: 'NEFT',
    account_holder_name: 'Blue Hall LLP',
    account_number: '123456789012',
    ifsc_code: 'HDFC0001234',
    upi_id: '',
    allocations: [
      { pod_id: 'DUN-POD-4821', amount: 900 },
      { pod_id: 'DUN-POD-5102', amount: 600 },
    ],
    ...over,
  });

export type PodWithdrawalGroupMock = { __typename?: 'PodWithdrawalGroup' } & PodWithdrawalGroup;

export const makePodWithdrawalGroup = (
  over: Partial<PodWithdrawalGroup> = {},
): PodWithdrawalGroupMock => ({
  __typename: 'PodWithdrawalGroup',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunday Badminton',
  requested_from: ['HOST', 'VENUE_OWNER'],
  status: 'PENDING',
  attributed_total: 1400,
  withdrawal_count: 2,
  last_requested_at: '2026-07-30T10:00:00.000Z',
  ...over,
});

export const podWithdrawalSummaryMock = (
  summary: PodWithdrawalGroupMock | null = makePodWithdrawalGroup(),
  podId = 'DUN-POD-4821',
): MockedResponse => ({
  request: { query: POD_WITHDRAWAL_SUMMARY, variables: { pod_id: podId } },
  result: { data: { podWithdrawalSummary: summary } },
  maxUsageCount: 20,
});

export const podWithdrawalSummaryLoadingMock = (): MockedResponse => ({
  ...podWithdrawalSummaryMock(),
  delay: 60_000,
});

export const podWithdrawalSummaryErrorMock = (): MockedResponse => ({
  request: { query: POD_WITHDRAWAL_SUMMARY, variables: { pod_id: 'DUN-POD-4821' } },
  error: new Error('summary unavailable'),
});

export const reviewWithdrawalMock = (
  over: { fail?: boolean; delay?: number } = {},
): MockedResponse => ({
  request: { query: REVIEW_WITHDRAWAL, variables: () => true },
  ...(over.delay ? { delay: over.delay } : {}),
  ...(over.fail
    ? { error: new Error('review failed') }
    : {
        result: {
          data: { reviewWithdrawal: { __typename: 'WalletWithdrawal', id: 'w1', status: 'PAID' } },
        },
      }),
  maxUsageCount: 20,
});

export const makeWithdrawalMinimums = (
  over: Partial<WithdrawalMinimums> = {},
): { __typename: 'WithdrawalMinimums' } & WithdrawalMinimums => ({
  __typename: 'WithdrawalMinimums',
  host: 1000,
  venue_owner: 2500,
  ecomm_manager: 1500,
  club_admin: 500,
  ...over,
});

export const withdrawalMinimumsMock = (
  minimums = makeWithdrawalMinimums(),
  delay = 0,
): MockedResponse => ({
  request: { query: WITHDRAWAL_MINIMUMS },
  result: {
    data: {
      withdrawalMinimums: minimums,
      publicFinanceSettings: { __typename: 'PublicFinanceSettings', currency_symbol: '₹' },
    },
  },
  delay,
  maxUsageCount: 20,
});

export const updateWithdrawalMinimumsMock = (
  over: { saved?: Partial<WithdrawalMinimums>; fail?: boolean } = {},
): MockedResponse => ({
  request: { query: UPDATE_WITHDRAWAL_MINIMUMS, variables: () => true },
  ...(over.fail
    ? { error: new Error('minimum rejected') }
    : { result: { data: { updateWithdrawalMinimums: makeWithdrawalMinimums(over.saved) } } }),
  maxUsageCount: 20,
});
