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
  /** Razorpay's own ids, as its dashboard shows them (null/empty for other gateways). */
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_refund_ids?: string[];
  paid_at: string | null;
  created_at: string;
  partial: boolean;
  /** Where the money stands at Razorpay; null for refunds recorded before refunds went through Razorpay. */
  refund_status?: RefundGatewayStatus | null;
}

/** PaymentRefundStatus — accepted by Razorpay (PROCESSING) is not yet money in the buyer's bank. */
export type RefundGatewayStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RECONCILIATION_REQUIRED'
  | 'NOT_APPLICABLE';

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
        razorpay_payment_id
        razorpay_order_id
        razorpay_refund_ids
        paid_at
        created_at
        partial
        refund_status
      }
    }
  }
`;
