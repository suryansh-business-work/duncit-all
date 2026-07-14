import { gql } from '@apollo/client';

export const PAYMENTS = gql`
  query AdminPayments($filter: PaymentFilterInput, $limit: Int) {
    payments(filter: $filter, limit: $limit) {
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
      gateway_ref
      paid_at
      created_at
    }
  }
`;

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
  total: number;
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
    total
    currency_symbol
    status
    gateway
    gateway_ref
    paid_at
    created_at
  }
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
