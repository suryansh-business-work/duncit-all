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

/** Which pod's earnings funded a slice of one withdrawal. */
export interface WithdrawalAllocation {
  pod_id: string;
  amount: number;
}

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
  allocations: WithdrawalAllocation[];
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
    allocations {
      pod_id
      amount
    }
  }
`;

/** A pod somebody has withdrawn against — one row of the Withdrawal Payments list. */
export interface PodWithdrawalGroup {
  pod_id: string;
  pod_title: string;
  requested_from: WithdrawerRole[];
  status: 'PENDING' | 'APPROVED';
  attributed_total: number;
  withdrawal_count: number;
  last_requested_at: string;
}

export const POD_WITHDRAWAL_GROUPS_TABLE = gql`
  query PodWithdrawalGroupsTable($query: TableQueryInput) {
    podWithdrawalGroupsTable(query: $query) {
      total
      rows {
        pod_id
        pod_title
        requested_from
        status
        attributed_total
        withdrawal_count
        last_requested_at
      }
    }
  }
`;

export const POD_WITHDRAWAL_SUMMARY = gql`
  query PodWithdrawalSummary($pod_id: ID!) {
    podWithdrawalSummary(pod_id: $pod_id) {
      pod_id
      pod_title
      requested_from
      status
      attributed_total
      withdrawal_count
      last_requested_at
    }
  }
`;

/**
 * One pod's withdrawal requests — the same row shape the flat list used, so the
 * drill-down renders the identical table.
 */
export const POD_WITHDRAWALS_TABLE = gql`
  query PodWithdrawalsTable($pod_id: ID!, $query: TableQueryInput) {
    podWithdrawalsTable(pod_id: $pod_id, query: $query) {
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
