import { gql } from '@apollo/client';
import type { WithdrawerRole } from './roles';

export const WITHDRAWALS = gql`
  query Withdrawals($status: WithdrawalStatus) {
    withdrawalRequests(status: $status) {
      id
      withdrawal_id
      beneficiary_name
      beneficiary_email
      amount
      withdrawer_role
      status
      payout_method
      account_holder_name
      account_number
      ifsc_code
      upi_id
      scheduled_for
      reject_reason
      requested_at
    }
  }
`;

/** Row shape for the withdrawals table (fields the columns and dialogs touch). */
export interface WithdrawalRow {
  id: string;
  withdrawal_id: string;
  beneficiary_name: string;
  beneficiary_email: string;
  amount: number;
  withdrawer_role: WithdrawerRole;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  payout_method: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  scheduled_for: string;
  reject_reason: string;
  requested_at: string;
}

/** Same selection as WITHDRAWALS rows, for the server-paged table query. */
const WITHDRAWAL_ROW_FIELDS = gql`
  fragment WithdrawalRowFields on WalletWithdrawal {
    id
    withdrawal_id
    beneficiary_name
    beneficiary_email
    amount
    withdrawer_role
    status
    payout_method
    account_holder_name
    account_number
    ifsc_code
    upi_id
    scheduled_for
    reject_reason
    requested_at
  }
`;

export const WITHDRAWALS_TABLE = gql`
  query WithdrawalsTable($query: TableQueryInput) {
    withdrawalRequestsTable(query: $query) {
      total
      rows {
        ...WithdrawalRowFields
      }
    }
  }
  ${WITHDRAWAL_ROW_FIELDS}
`;

export const REVIEW_WITHDRAWAL = gql`
  mutation ReviewWithdrawal($id: ID!, $input: ReviewWithdrawalInput!) {
    reviewWithdrawal(withdrawal_id: $id, input: $input) {
      id
      status
    }
  }
`;

/** Role-wise minimum withdrawal amounts, one value per role. */
export interface WithdrawalMinimums {
  host: number;
  venue_owner: number;
  ecomm_manager: number;
  club_admin: number;
}

export const WITHDRAWAL_MINIMUMS = gql`
  query WithdrawalMinimums {
    withdrawalMinimums {
      host
      venue_owner
      ecomm_manager
      club_admin
    }
    # The symbol the amounts are entered in — a configured setting, never a literal.
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

/**
 * Every input field is optional server-side, so a save sends ONLY the role that
 * was edited — the other three keep their stored value.
 */
export const UPDATE_WITHDRAWAL_MINIMUMS = gql`
  mutation UpdateWithdrawalMinimums($input: UpdateWithdrawalMinimumsInput!) {
    updateWithdrawalMinimums(input: $input) {
      host
      venue_owner
      ecomm_manager
      club_admin
    }
  }
`;
