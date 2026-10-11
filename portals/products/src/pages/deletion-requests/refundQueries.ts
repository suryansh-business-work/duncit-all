import { gql } from '@apollo/client';

/** One order a deletion request cancelled — who is refunded, what goes back and where it stands. */
export interface DeletionRefundRow {
  id: string;
  order_no: string;
  buyer_name: string;
  buyer_email: string;
  brand_name: string | null;
  deletion_request_id: string | null;
  deletion_request_no: string;
  currency_symbol: string;
  total: number;
  cancelled_at: string | null;
  cancel_reason: string;
  line_items: { name: string; variant_label: string; qty: number }[];
  refund: {
    status: 'NONE' | 'PENDING' | 'PROCESSED' | 'RECORDED' | 'FAILED';
    amount: number;
    coins: number;
    razorpay_refund_id: string;
    refunded_at: string | null;
    error: string;
  };
}

/** Orders cancelled by deletion requests — every one, or one request's own when `request_id` is given. */
export const DELETION_REFUNDS_TABLE = gql`
  query DeletionRefundsTable($query: TableQueryInput, $request_id: ID) {
    deletionRefundsTable(query: $query, request_id: $request_id) {
      total
      rows {
        id
        order_no
        buyer_name
        buyer_email
        brand_name
        deletion_request_id
        deletion_request_no
        currency_symbol
        total
        cancelled_at
        cancel_reason
        line_items { name variant_label qty }
        refund { status amount coins razorpay_refund_id refunded_at error }
      }
    }
  }
`;
