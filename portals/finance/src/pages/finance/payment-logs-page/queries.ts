import { gql } from '@apollo/client';

/** The two shops Finance tracks separately — never mixed in one list. */
export type PaymentShop = 'POD_SHOP' | 'ECOMM';

export const PAYMENT_TOTALS = gql`
  query PaymentTotals($filter: PaymentFilterInput, $shop: PaymentShop) {
    paymentTotals(filter: $filter, shop: $shop) {
      count
      gross
      fee
      gst
      ticket_discount_total
    }
  }
`;

/** The KPI roll-up over the payments the table's filter matches. */
export interface PaymentTotals {
  count: number;
  gross: number;
  fee: number;
  gst: number;
  /** Sum of the multi-ticket discounts frozen on those payments. */
  ticket_discount_total: number;
}

/** Row shape for the payments table (fields the columns and dialogs touch). */
export interface PaymentRow {
  id: string;
  payment_id: string;
  invoice_no: string | null;
  user_name: string;
  user_email: string;
  description: string;
  subtotal: number;
  platform_fee_amount: number;
  gst_amount: number;
  coins_redeemed?: number | null;
  coins_earned?: number | null;
  /** The multi-ticket tier frozen on the payment at checkout (0 when none applied). */
  ticket_discount_amount: number;
  ticket_discount_pct: number;
  total: number;
  /** What rounding the bill up to a whole rupee added — inside `total` (0 when none). */
  round_off?: number | null;
  /** POD for a booking (with or without shop add-ons), PRODUCT for a shop cart. */
  target_type?: string | null;
  currency_symbol: string;
  status: string;
  gateway: string;
  gateway_ref: string | null;
  paid_at: string | null;
  created_at: string;
}

/** Same selection as AdminPayments rows, for the server-paged table query. */
const PAYMENT_ROW_FIELDS = gql`
  fragment PaymentRowFields on Payment {
    id
    payment_id
    invoice_no
    user_name
    user_email
    description
    subtotal
    platform_fee_amount
    gst_amount
    coins_redeemed
    coins_earned
    ticket_discount_amount
    ticket_discount_pct
    total
    round_off
    target_type
    currency_symbol
    status
    gateway
    gateway_ref
    paid_at
    created_at
  }
`;

/** One shop's payment log — the shop is fixed by the server, so no filter here can widen it. */
export const SHOP_PAYMENTS_TABLE = gql`
  query ShopPaymentsTable($shop: PaymentShop!, $query: TableQueryInput) {
    shopPaymentsTable(shop: $shop, query: $query) {
      total
      rows {
        ...PaymentRowFields
      }
    }
  }
  ${PAYMENT_ROW_FIELDS}
`;

export const PAYMENTS_TABLE = gql`
  query PaymentsTable($query: TableQueryInput) {
    paymentsTable(query: $query) {
      total
      rows {
        ...PaymentRowFields
      }
    }
  }
  ${PAYMENT_ROW_FIELDS}
`;

export const INVOICE_PDF = gql`
  query InvoicePdf($id: ID!) {
    paymentInvoicePdfBase64(payment_doc_id: $id)
  }
`;

export const REFUND_PAYMENT = gql`
  mutation RefundPayment($id: ID!, $reason: String) {
    refundPayment(payment_doc_id: $id, reason: $reason) {
      id
      status
    }
  }
`;
