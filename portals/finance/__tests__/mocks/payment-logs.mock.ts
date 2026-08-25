import type { MockedResponse } from '@apollo/client/testing';
import type { Payment } from '@duncit/gql-types';
import {
  INVOICE_PDF,
  PAYMENT_TOTALS,
  PAYMENTS_TABLE,
  REFUND_PAYMENT,
} from '../../src/pages/finance/payment-logs-page/queries';

/**
 * Payment-logs mocks. The KPI cards come from `useQuery(PAYMENT_TOTALS)`, which
 * the server rolls up; the table rows are fetched imperatively via
 * `client.query(PAYMENTS_TABLE)`; the invoice download and refund flow through
 * `client.query(INVOICE_PDF)` and `useMutation(REFUND_PAYMENT)`. Rows are a
 * schema-synced `Pick` of `Payment`.
 *
 * The totals query used to be called `PAYMENTS` and to answer with the list
 * itself. When it became a server-side roll-up this file kept importing the old
 * name, which is `undefined` — and a MockedResponse whose `request.query` is
 * undefined throws Apollo's "Expecting a parsed GraphQL document" before a
 * single assertion runs, so all six suites here died on it.
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

/**
 * The four KPI cards, rolled up from the rows they describe rather than from
 * numbers typed by hand — a card that disagrees with the table under it is the
 * one thing this screen must never do.
 *
 * `null` stands for the query having answered nothing at all, which is the
 * page's empty-totals branch.
 */
export const paymentTotalsMock = (payments: PaymentRowMock[] | null): MockedResponse => ({
  request: { query: PAYMENT_TOTALS },
  variableMatcher: () => true,
  result: {
    data: {
      paymentTotals: payments && {
        __typename: 'PaymentTotals',
        count: payments.length,
        gross: payments.reduce((sum, p) => sum + p.total, 0),
        fee: payments.reduce((sum, p) => sum + p.platform_fee_amount, 0),
        gst: payments.reduce((sum, p) => sum + p.gst_amount, 0),
      },
    },
  },
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
