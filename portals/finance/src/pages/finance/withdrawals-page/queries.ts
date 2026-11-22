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
  /** What was asked for. `amount` is what was approved once a partial approval lowers it. */
  requested_amount: number;
  approval_status: ApprovalStatus;
  approved_amount: number | null;
  decision_reason: string;
  reviewed_by_name: string;
  payout_status: PayoutStatus | null;
  display_status: MoneyOutStatus;
  razorpay_payout_id: string;
  payout_utr: string;
  payout_failure_reason: string;
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED';
export type PayoutStatus = 'PROCESSING' | 'PAID' | 'FAILED';
export type MoneyOutStatus = ApprovalStatus | PayoutStatus;

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
    requested_amount
    approval_status
    approved_amount
    decision_reason
    reviewed_by_name
    payout_status
    display_status
    razorpay_payout_id
    payout_utr
    payout_failure_reason
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

/** Everything the Accept dialog shows: the withdrawal, whether its account is verified, and whether payouts can run. */
export const WITHDRAWAL_REVIEW = gql`
  query WithdrawalReview($id: ID!) {
    withdrawalReview(withdrawal_id: $id) {
      account_verified
      payouts_configured
      wallet_balance
      currency_symbol
      verified_account {
        id
        source
        label
      }
      withdrawal {
        ...WithdrawalRowFields
      }
    }
  }
  ${WITHDRAWAL_ROW_FIELDS}
`;

export interface WithdrawalReviewData {
  withdrawalReview: {
    account_verified: boolean;
    payouts_configured: boolean;
    wallet_balance: number;
    currency_symbol: string;
    verified_account: { id: string; source: string; label: string } | null;
    withdrawal: WithdrawalRow;
  };
}

export type WithdrawalDecision = 'APPROVE' | 'PARTIAL' | 'REJECT';

export const DECIDE_WITHDRAWAL = gql`
  mutation DecideWithdrawal($id: ID!, $input: DecideWithdrawalInput!) {
    decideWithdrawal(withdrawal_id: $id, input: $input) {
      id
      display_status
    }
  }
`;

export const RETRY_WITHDRAWAL_PAYOUT = gql`
  mutation RetryWithdrawalPayout($id: ID!) {
    retryWithdrawalPayout(withdrawal_id: $id) {
      id
      display_status
    }
  }
`;

/** One row of the immutable money-out audit trail. */
export interface PayoutAuditRow {
  id: string;
  subject_id: string;
  action: string;
  user_name: string;
  requested_amount: number;
  approved_amount: number | null;
  reason: string;
  actor_name: string;
  actor_role: string;
  payment_status: string;
  razorpay_payout_id: string;
  utr: string;
  created_at: string;
}

/** Withdrawal Logs: every decision and every payout step, newest first. */
export const PAYOUT_AUDIT_TABLE = gql`
  query PayoutAuditTable($kind: PayoutSubject!, $query: TableQueryInput) {
    payoutAuditTable(kind: $kind, query: $query) {
      total
      rows {
        id
        subject_id
        action
        user_name
        requested_amount
        approved_amount
        reason
        actor_name
        actor_role
        payment_status
        razorpay_payout_id
        utr
        created_at
      }
    }
  }
`;
