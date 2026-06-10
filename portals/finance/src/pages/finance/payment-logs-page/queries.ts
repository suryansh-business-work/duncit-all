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
