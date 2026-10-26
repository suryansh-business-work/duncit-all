import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  SHOP_ORDER_REFUNDS_TABLE,
  type OrderRefundRow,
  type OrderRefundSummary,
} from '../../src/pages/finance/order-refunds-page/queries';
import {
  ROUND_OFFS_TABLE,
  type RoundOffRow,
  type RoundOffSummary,
} from '../../src/pages/finance/round-offs-page/queries';

/**
 * Finance > Order Refunds and Round Offs: one page of rows plus the server's
 * totals for the filter, answered for ANY table query — the stubbed table sends
 * its own initial state, and the page under test only cares what comes back.
 */
export const makeOrderRefund = (
  over: Partial<OrderRefundRow> = {},
): OrderRefundRow & { __typename: 'ShopOrderRefund' } => ({
  __typename: 'ShopOrderRefund',
  id: 'r1',
  kind: 'CANCELLATION',
  ref_no: 'ORD-1001',
  order_no: 'ORD-1001',
  order_id: 'o1',
  buyer_name: 'Riya Sharma',
  buyer_email: 'riya@duncit.com',
  payment_doc_id: 'p1',
  payment_ref: 'DUN-PAY-4821',
  currency_symbol: '₹',
  order_total: 1250,
  cash_amount: 1000,
  coins: 250,
  refund_value: 1250,
  razorpay_refund_id: 'rfnd_Nx12',
  status: 'PROCESSED',
  mode: 'RAZORPAY_COINS',
  initiated_by: 'finance@duncit.com',
  error: '',
  derived: false,
  manual_payout: false,
  event_at: '2026-09-01T10:00:00.000Z',
  ...over,
});

export const makeOrderRefundSummary = (
  over: Partial<OrderRefundSummary> = {},
): OrderRefundSummary & { __typename: 'ShopOrderRefundSummary' } => ({
  __typename: 'ShopOrderRefundSummary',
  count: 2,
  cash_total: 2500.5,
  coins_total: 400,
  manual_payout_total: 1000,
  ...over,
});

/** `onCall` receives the variables of every query the page sends, in order. */
export const orderRefundsTableMock = (
  rows: OrderRefundRow[],
  summary = makeOrderRefundSummary(),
  onCall: (variables: Record<string, unknown>) => void = () => undefined,
): MockedResponse => ({
  request: {
    query: SHOP_ORDER_REFUNDS_TABLE,
    variables: (variables: Record<string, unknown>) => {
      onCall(variables);
      return true;
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      shopOrderRefundsTable: {
        __typename: 'ShopOrderRefundTablePage',
        total: rows.length,
        summary,
        rows: rows.map((row) => ({ __typename: 'ShopOrderRefund', ...row })),
      },
    },
  },
});

export const orderRefundsErrorMock = (message: string): MockedResponse => ({
  request: { query: SHOP_ORDER_REFUNDS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { errors: [new GraphQLError(message)] },
});

export const makeRoundOff = (
  over: Partial<RoundOffRow> = {},
): RoundOffRow & { __typename: 'PaymentRoundOff' } => ({
  __typename: 'PaymentRoundOff',
  id: 'p1',
  payment_id: 'DUN-PAY-4821',
  invoice_no: 'INV-2026-0042',
  user_name: 'Riya Sharma',
  user_email: 'riya@duncit.com',
  description: 'Sunrise Yoga — 2 seats',
  source: 'POD_BOOKING',
  bill_amount: 999.6,
  round_off: 0.4,
  coins_redeemed: 0,
  total: 1000,
  currency_symbol: '₹',
  status: 'SUCCESS',
  gateway: 'razorpay',
  paid_at: '2026-09-01T10:00:00.000Z',
  created_at: '2026-09-01T09:59:00.000Z',
  ...over,
});

export const makeRoundOffSummary = (
  over: Partial<RoundOffSummary> = {},
): RoundOffSummary & { __typename: 'PaymentRoundOffSummary' } => ({
  __typename: 'PaymentRoundOffSummary',
  count: 2,
  round_off_total: 0.9,
  collected_round_off_total: 0.4,
  ...over,
});

export const roundOffsTableMock = (
  rows: RoundOffRow[],
  summary = makeRoundOffSummary(),
  onCall: (variables: Record<string, unknown>) => void = () => undefined,
): MockedResponse => ({
  request: {
    query: ROUND_OFFS_TABLE,
    variables: (variables: Record<string, unknown>) => {
      onCall(variables);
      return true;
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      paymentRoundOffsTable: {
        __typename: 'PaymentRoundOffTablePage',
        total: rows.length,
        summary,
        rows: rows.map((row) => ({ __typename: 'PaymentRoundOff', ...row })),
      },
    },
  },
});

/** An answer carrying no page at all — what the table must survive without showing stale rows. */
export const orderRefundsNoPageMock = (): MockedResponse => ({
  request: { query: SHOP_ORDER_REFUNDS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: null },
});

export const roundOffsNoPageMock = (): MockedResponse => ({
  request: { query: ROUND_OFFS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: null },
});
