import { gql, type TypedDocumentNode } from '@apollo/client';
import type { QueryUserFinanceSummaryArgs, UserFinanceSummary } from '@duncit/gql-types';

/**
 * Admin › User › Payment & Refund Logs. The three logs reuse the platform-wide
 * Finance tables, narrowed to the account by a `user_id` filter both servers
 * allowlist — admin roles already read every row of them, so a client filter
 * widens nothing.
 */

export const USER_FINANCE_SUMMARY: TypedDocumentNode<
  { userFinanceSummary: UserFinanceSummary },
  QueryUserFinanceSummaryArgs
> = gql`
  query AdminUserFinanceSummary($user_id: ID!) {
    userFinanceSummary(user_id: $user_id) {
      currency_symbol
      payment_count
      failed_count
      paid_total
      refund_count
      refunded_total
      net_business
      coins_redeemed
      last_paid_at
      coins {
        balance
        lifetime_earned
        credited
        debited
      }
    }
  }
`;

export interface UserPaymentRow {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  description: string;
  total: number;
  coins_redeemed: number | null;
  coins_earned: number | null;
  currency_symbol: string;
  status: string;
  gateway: string;
  paid_at: string | null;
  created_at: string;
}

export const USER_PAYMENTS_TABLE = gql`
  query AdminUserPaymentsTable($query: TableQueryInput) {
    paymentsTable(query: $query) {
      total
      rows {
        id
        payment_id
        invoice_no
        description
        total
        coins_redeemed
        coins_earned
        currency_symbol
        status
        gateway
        paid_at
        created_at
      }
    }
  }
`;

export interface UserRefundRow {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  description: string;
  total: number;
  currency_symbol: string;
  status: string;
  refund_amount: number;
  refund_reason: string | null;
  refund_initiated_by: string | null;
  refunded_at: string | null;
  partial: boolean;
}

export const USER_REFUNDS_TABLE = gql`
  query AdminUserRefundsTable($query: TableQueryInput) {
    userRefundsTable(query: $query) {
      total
      rows {
        id
        payment_id
        invoice_no
        description
        total
        currency_symbol
        status
        refund_amount
        refund_reason
        refund_initiated_by
        refunded_at
        partial
      }
    }
  }
`;

export interface UserCoinRow {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance_after: number;
  source: string;
  reason: string;
  payment_id: string | null;
  created_at: string;
}

export const USER_COIN_TABLE = gql`
  query AdminUserCoinTransactionsTable($query: TableQueryInput) {
    coinTransactionsTable(query: $query) {
      total
      rows {
        id
        type
        amount
        balance_after
        source
        reason
        payment_id
        created_at
      }
    }
  }
`;
