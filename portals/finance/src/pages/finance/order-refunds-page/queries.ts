import { gql } from '@apollo/client';
import type { PaymentShop } from '../payment-logs-page/queries';

export type { PaymentShop };

export type OrderRefundKind = 'CANCELLATION' | 'RETURN';
export type OrderRefundMode = 'RAZORPAY' | 'COINS' | 'RAZORPAY_COINS';

/** One refund event at order level — a cancelled order or a refunded return. */
export interface OrderRefundRow {
  id: string;
  kind: OrderRefundKind;
  /** The order number for a cancellation, the return number for a return. */
  ref_no: string;
  order_no: string;
  order_id: string;
  buyer_name: string;
  buyer_email: string;
  /** Null when the payment no longer exists — the row then opens nothing. */
  payment_doc_id: string | null;
  payment_ref: string;
  currency_symbol: string;
  order_total: number;
  /** Money going back to the original payment method. */
  cash_amount: number;
  /** Duncit Coins going back to the buyer's wallet. */
  coins: number;
  refund_value: number;
  razorpay_refund_id: string;
  status: string;
  mode: OrderRefundMode;
  initiated_by: string;
  error: string;
  /** Pet store only: worked out from the cancel rule rather than read back. */
  derived: boolean;
  manual_payout: boolean;
  event_at: string | null;
}

/** Totals over every refund the table's filter matches — worked out by the server. */
export interface OrderRefundSummary {
  count: number;
  cash_total: number;
  coins_total: number;
  manual_payout_total: number;
}

export const EMPTY_ORDER_REFUND_SUMMARY: OrderRefundSummary = {
  count: 0,
  cash_total: 0,
  coins_total: 0,
  manual_payout_total: 0,
};

/** One shop's refunds — the shop is fixed by the server, so no filter here can widen it. */
export const SHOP_ORDER_REFUNDS_TABLE = gql`
  query ShopOrderRefundsTable($shop: PaymentShop!, $query: TableQueryInput) {
    shopOrderRefundsTable(shop: $shop, query: $query) {
      total
      summary {
        count
        cash_total
        coins_total
        manual_payout_total
      }
      rows {
        id
        kind
        ref_no
        order_no
        order_id
        buyer_name
        buyer_email
        payment_doc_id
        payment_ref
        currency_symbol
        order_total
        cash_amount
        coins
        refund_value
        razorpay_refund_id
        status
        mode
        initiated_by
        error
        derived
        manual_payout
        event_at
      }
    }
  }
`;

/** What `shopOrderRefundsTable` answers with: one page of refund events and the totals for the filter. */
export interface OrderRefundsData {
  shopOrderRefundsTable: { rows: OrderRefundRow[]; total: number; summary: OrderRefundSummary | null } | null;
}
