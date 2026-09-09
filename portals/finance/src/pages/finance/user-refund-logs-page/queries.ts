import { gql } from '@apollo/client';

/** Row shape for the User Refund Logs table (the fields the columns touch). */
export interface UserRefundRow {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  user_name: string;
  user_email: string;
  description: string;
  subtotal: number;
  platform_fee_amount: number;
  gst_amount: number;
  total: number;
  currency_symbol: string;
  status: string;
  gateway: string;
  refund_amount: number;
  refund_reason: string | null;
  refund_initiated_by: string | null;
  refunded_at: string | null;
  paid_at: string | null;
  created_at: string;
  partial: boolean;
}

export const USER_REFUNDS_TABLE = gql`
  query UserRefundsTable($query: TableQueryInput) {
    userRefundsTable(query: $query) {
      total
      rows {
        id
        payment_id
        invoice_no
        user_name
        user_email
        description
        subtotal
        platform_fee_amount
        gst_amount
        total
        currency_symbol
        status
        gateway
        refund_amount
        refund_reason
        refund_initiated_by
        refunded_at
        paid_at
        created_at
        partial
      }
    }
  }
`;
