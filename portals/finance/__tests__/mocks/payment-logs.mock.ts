import type { MockedResponse } from '@apollo/client/testing';
import type { Payment } from '@duncit/gql-types';
import {
  INVOICE_PDF,
  PAYMENTS,
  PAYMENTS_TABLE,
  REFUND_PAYMENT,
} from '../../src/pages/finance/payment-logs-page/queries';

/**
 * Payment-logs mocks. The KPI totals come from `useQuery(PAYMENTS)`; the table
 * rows are fetched imperatively via `client.query(PAYMENTS_TABLE)`; the invoice
 * download and refund flow through `client.query(INVOICE_PDF)` and
 * `useMutation(REFUND_PAYMENT)`. Rows are a schema-synced `Pick` of `Payment`.
 */
export type PaymentRowMock = { __typename?: 'Payment' } & Pick<
  Payment,
  | 'id'
  | 'payment_id'
  | 'invoice_no'
  | 'user_name'
  | 'user_email'
  | 'description'
  | 'subtotal'
  | 'platform_fee_amount'
  | 'gst_amount'
  | 'total'
  | 'currency_symbol'
  | 'status'
  | 'gateway'
  | 'gateway_ref'
  | 'paid_at'
  | 'created_at'
>;

export const makePayment = (over: Partial<PaymentRowMock> = {}): PaymentRowMock => ({
  __typename: 'Payment',
  id: 'p1',
  payment_id: 'pay_1',
  invoice_no: 'INV-1',
  user_name: 'Riya',
  user_email: 'r@x.com',
  description: 'Pod',
  subtotal: 100,
  platform_fee_amount: 5,
  gst_amount: 15,
  total: 120,
  currency_symbol: '₹',
  status: 'SUCCESS',
  gateway: 'razorpay',
  gateway_ref: 'gw',
  paid_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  ...over,
});

export const paymentSuccess = (): PaymentRowMock => makePayment();
export const paymentFailed = (): PaymentRowMock =>
  makePayment({ id: 'p2', payment_id: 'pay_2', user_name: 'Ravi', invoice_no: null, status: 'FAILED', paid_at: null });

export const paymentsListMock = (payments: PaymentRowMock[] | null): MockedResponse => ({
  request: { query: PAYMENTS },
  variableMatcher: () => true,
  result: { data: { payments } },
  maxUsageCount: 50,
});

export const paymentsTableMock = (rows: PaymentRowMock[]): MockedResponse => ({
  request: { query: PAYMENTS_TABLE },
  variableMatcher: () => true,
  result: { data: { paymentsTable: { __typename: 'PaymentTablePage', rows, total: rows.length } } },
  maxUsageCount: 50,
});

export const invoicePdfMock = (
  base64: string | null = 'aGVsbG8=',
  over: { fail?: boolean } = {},
): MockedResponse => ({
  request: { query: INVOICE_PDF },
  variableMatcher: () => true,
  ...(over.fail
    ? { error: new Error('pdf failed') }
    : { result: { data: { paymentInvoicePdfBase64: base64 } } }),
  maxUsageCount: 20,
});

export const refundPaymentMock = (over: { fail?: boolean; delay?: number } = {}): MockedResponse => ({
  request: { query: REFUND_PAYMENT },
  variableMatcher: () => true,
  ...(over.delay ? { delay: over.delay } : {}),
  ...(over.fail
    ? { error: new Error('refund failed') }
    : { result: { data: { refundPayment: { __typename: 'Payment', id: 'p1', status: 'REFUNDED' } } } }),
  maxUsageCount: 20,
});
