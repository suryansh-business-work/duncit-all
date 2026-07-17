import type { MockedResponse } from '@apollo/client/testing';
import type { WalletWithdrawal } from '@duncit/gql-types';
import { REVIEW_WITHDRAWAL } from '../../src/pages/finance/withdrawals-page/queries';

/**
 * Withdrawal table rows (fed to the stubbed `@duncit/table` via `tableControls`,
 * not through Apollo). Typed as a schema-synced `Pick` of `WalletWithdrawal`;
 * `status` is widened to also accept an out-of-enum value so the table's
 * unknown-status fallback chip can be exercised.
 */
export type WithdrawalRowMock = { __typename?: 'WalletWithdrawal' } & Pick<
  WalletWithdrawal,
  | 'id'
  | 'withdrawal_id'
  | 'beneficiary_name'
  | 'beneficiary_email'
  | 'amount'
  | 'payout_method'
  | 'account_holder_name'
  | 'account_number'
  | 'ifsc_code'
  | 'upi_id'
  | 'scheduled_for'
  | 'reject_reason'
  | 'requested_at'
> & { status: WalletWithdrawal['status'] | (string & {}) };

export const makeWithdrawalRow = (over: Partial<WithdrawalRowMock> = {}): WithdrawalRowMock => ({
  __typename: 'WalletWithdrawal',
  id: 'w1',
  withdrawal_id: 'WD-1',
  beneficiary_name: 'Host A',
  beneficiary_email: 'a@x',
  amount: 500,
  status: 'PENDING',
  payout_method: 'UPI',
  account_holder_name: 'A',
  account_number: '',
  ifsc_code: '',
  upi_id: 'a@upi',
  scheduled_for: '2024-01-01',
  reject_reason: '',
  requested_at: '2024-01-01',
  ...over,
});

export const reviewWithdrawalMock = (
  over: { fail?: boolean; delay?: number } = {},
): MockedResponse => ({
  request: { query: REVIEW_WITHDRAWAL },
  variableMatcher: () => true,
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
