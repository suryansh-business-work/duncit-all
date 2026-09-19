import type { MockedResponse } from '@apollo/client/testing';
import {
  USER_REFUNDS_TABLE,
  type UserRefundRow,
} from '../../src/pages/finance/user-refund-logs-page/queries';

/**
 * User Refund Logs mocks. The page fetches its rows imperatively through
 * `client.query(USER_REFUNDS_TABLE)` inside the table's `fetchRows`, so the
 * rows travel through MockedProvider (not `tableControls.rows`). Rows are the
 * page's own `UserRefundRow` contract plus the server's `__typename`.
 */
export type UserRefundRowMock = { __typename: 'UserRefund' } & UserRefundRow;

/** A whole booking an admin refunded from the console: full, no initiator. */
export const makeUserRefund = (over: Partial<UserRefundRowMock> = {}): UserRefundRowMock => ({
  __typename: 'UserRefund',
  id: 'pay_doc_1',
  payment_id: 'DUN-PAY-4821',
  invoice_no: 'INV-2026-0042',
  user_name: 'Riya Sharma',
  user_email: 'riya@duncit.com',
  description: 'Sunrise Yoga — 2 seats',
  subtotal: 847.46,
  platform_fee_amount: 84.75,
  gst_amount: 152.54,
  total: 1000,
  currency_symbol: '₹',
  status: 'REFUNDED',
  gateway: 'razorpay',
  refund_amount: 1000,
  refund_reason: 'Duplicate charge',
  refund_initiated_by: null,
  refunded_at: '2026-09-03T08:15:00.000Z',
  paid_at: '2026-09-01T10:00:00.000Z',
  created_at: '2026-09-01T09:59:00.000Z',
  partial: false,
  ...over,
});

/** A pod cancellation that returned one of two seats — the payment stays SUCCESS. */
export const makePartialRefund = (): UserRefundRowMock =>
  makeUserRefund({
    id: 'pay_doc_2',
    payment_id: 'DUN-PAY-4822',
    invoice_no: null,
    user_name: 'Aman Verma',
    user_email: 'aman@duncit.com',
    status: 'SUCCESS',
    refund_amount: 500,
    refund_reason: null,
    refund_initiated_by: 'SYSTEM',
    paid_at: null,
    partial: true,
  });

/** `maxUsageCount` 1 lets a second mock answer the next read (the 30 s poll). */
export const userRefundsTableMock = (rows: UserRefundRowMock[], maxUsageCount = 20): MockedResponse => ({
  request: { query: USER_REFUNDS_TABLE, variables: () => true },
  result: { data: { userRefundsTable: { __typename: 'UserRefundTablePage', rows, total: rows.length } } },
  maxUsageCount,
});

export const userRefundsTableErrorMock = (): MockedResponse => ({
  request: { query: USER_REFUNDS_TABLE, variables: () => true },
  error: new Error('refund log unavailable'),
});
