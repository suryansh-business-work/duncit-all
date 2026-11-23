/**
 * Payment Trace: which payments an id names, and every log it appears in.
 * Models are mocked with chainable queries; the matching rule has its own suite.
 */
const chain = (value: unknown) => {
  const q: Record<string, unknown> = {};
  for (const key of ['select', 'sort', 'limit']) q[key] = jest.fn(() => q);
  q.lean = jest.fn().mockResolvedValue(value);
  return q;
};

jest.mock('@modules/finance/payment/payment.model', () => ({ PaymentModel: { find: jest.fn() } }));
jest.mock('@modules/finance/payment/payment.gatewayRefund.model', () => ({ PaymentGatewayRefundModel: { find: jest.fn() } }));
jest.mock('@modules/finance/failedPayment/paymentEvent.model', () => ({ PaymentEventModel: { find: jest.fn() } }));
jest.mock('@modules/finance/failedPayment/failedPaymentCase.model', () => ({ FailedPaymentCaseModel: { find: jest.fn() } }));
jest.mock('@modules/finance/failedPayment/razorpayWebhookEvent.model', () => ({ RazorpayWebhookEventModel: { find: jest.fn() } }));
jest.mock('@modules/commerce/productOrder/productOrder.model', () => ({ ProductOrderModel: { find: jest.fn() } }));
jest.mock('@modules/venues/venueFood/venueFoodOrder.model', () => ({ VenueFoodOrderModel: { find: jest.fn() } }));
jest.mock('@modules/finance/failedPayment/failedPayment.read', () => ({
  toEventOut: (e: { _id: string; type: string }) => ({ id: String(e._id), type: e.type }),
}));

import { Types } from 'mongoose';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { PaymentGatewayRefundModel } from '@modules/finance/payment/payment.gatewayRefund.model';
import { PaymentEventModel } from '@modules/finance/failedPayment/paymentEvent.model';
import { FailedPaymentCaseModel } from '@modules/finance/failedPayment/failedPaymentCase.model';
import { RazorpayWebhookEventModel } from '@modules/finance/failedPayment/razorpayWebhookEvent.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { VenueFoodOrderModel } from '@modules/venues/venueFood/venueFoodOrder.model';
import { paymentTrace } from '../../paymentTrace.service';

const m = (fn: unknown) => fn as jest.Mock;
const DOC = new Types.ObjectId('65aa00000000000000000002');
const NOW = new Date('2026-11-23T10:00:00.000Z');

const payment = (over: Record<string, unknown> = {}) => ({
  _id: DOC,
  payment_id: 'DPAY-1',
  invoice_no: null,
  gateway: 'RAZORPAY',
  gateway_ref: 'pay_1',
  metadata: { razorpay_order_id: 'order_1', razorpay_refund_ids: ['rfnd_1'], store: { channel: 'PET_STORE' } },
  target_type: 'PRODUCT',
  status: 'REFUNDED',
  finalize_state: 'COMPLETE',
  total: 499,
  currency_symbol: '₹',
  description: 'Dog food',
  user_name: 'Riya',
  steps: [{ key: 'ORDER', status: 'DONE', detail: '', at: NOW }],
  created_at: NOW,
  paid_at: NOW,
  ...over,
});

/** Every model answers with nothing unless a test says otherwise. */
const answer = (overrides: Partial<Record<string, unknown[]>> = {}) => {
  m(PaymentModel.find).mockReturnValue(chain(overrides.payments ?? []));
  m(PaymentGatewayRefundModel.find).mockImplementation((filter: Record<string, unknown>) =>
    chain(filter.razorpay_refund_id ? overrides.refundLookup ?? [] : overrides.refunds ?? [])
  );
  m(PaymentEventModel.find).mockReturnValue(chain(overrides.events ?? []));
  m(FailedPaymentCaseModel.find).mockReturnValue(chain(overrides.cases ?? []));
  m(RazorpayWebhookEventModel.find).mockReturnValue(chain(overrides.webhooks ?? []));
  m(ProductOrderModel.find).mockReturnValue(chain(overrides.shopOrders ?? []));
  m(VenueFoodOrderModel.find).mockReturnValue(chain(overrides.foodOrders ?? []));
};

beforeEach(() => jest.clearAllMocks());

describe('paymentTrace', () => {
  it('lists the payment with its checkout, ids and match, and every log that mentions it', async () => {
    answer({
      payments: [payment()],
      events: [{ _id: 'e1', type: 'CAPTURED', payment_doc_id: DOC }],
      cases: [{ _id: 'c1', payment_doc_id: DOC, verification: { status: 'MATCHED' }, refund: { status: 'PROCESSED' }, resolution: { state: 'REFUNDED' }, created_at: NOW }],
      refunds: [{ _id: 'r1', payment_doc_id: DOC, source: 'FINANCE_REFUND', status: 'SUCCEEDED', amount_paise: 49900, razorpay_refund_id: 'rfnd_1', razorpay_payment_id: 'pay_1', reason: '', last_error: '', created_at: NOW, processed_at: NOW }],
      shopOrders: [{ _id: 'o1', payment_id: DOC, order_no: 'ORD-1', channel: 'PET_STORE', fulfilment_status: 'DELIVERED', total: 499, refund: { status: '' }, created_at: NOW }],
      webhooks: [{ _id: 'w1', event: 'payment.captured', summary: { payment_id: 'pay_1', order_id: 'order_1', refund_id: '', status: 'captured', amount: 49900 }, outcome: '', error: '', received_at: NOW }],
    });

    const trace = await paymentTrace('pay_1');

    expect(trace.found).toBe(true);
    expect(trace.payments[0]).toMatchObject({
      id: String(DOC),
      payment_id: 'DPAY-1',
      source: 'ECOMM',
      razorpay_payment_id: 'pay_1',
      razorpay_order_id: 'order_1',
      razorpay_refund_ids: ['rfnd_1'],
      matched_on: ['RAZORPAY_PAYMENT'],
      amount: 499,
    });
    expect(trace.steps).toEqual([{ payment_id: 'DPAY-1', key: 'ORDER', status: 'DONE', detail: null, at: NOW.toISOString() }]);
    expect(trace.events).toEqual([{ id: 'e1', type: 'CAPTURED', payment_id: 'DPAY-1' }]);
    expect(trace.failed_cases[0]).toMatchObject({ id: 'c1', payment_id: 'DPAY-1', refund_status: 'PROCESSED', resolution_state: 'REFUNDED' });
    expect(trace.gateway_refunds[0]).toMatchObject({ amount: 499, razorpay_refund_id: 'rfnd_1', reason: null, processed_at: NOW.toISOString() });
    expect(trace.shop_orders[0]).toMatchObject({ order_no: 'ORD-1', payment_id: 'DPAY-1', refund_status: 'NONE' });
    expect(trace.webhooks[0]).toMatchObject({ event: 'payment.captured', razorpay_payment_id: 'pay_1', razorpay_refund_id: null, amount: 499 });

    // The webhook log is asked by every Razorpay id the payment carries.
    expect(m(RazorpayWebhookEventModel.find).mock.calls[0][0]).toEqual({
      $or: [
        { 'summary.payment_id': { $in: ['pay_1'] } },
        { 'summary.order_id': { $in: ['order_1'] } },
        { 'summary.refund_id': { $in: ['rfnd_1'] } },
      ],
    });
    // A Razorpay-shaped id is also looked up among venue food orders.
    expect(m(VenueFoodOrderModel.find)).toHaveBeenCalledWith({
      $or: [{ razorpay_payment_id: 'pay_1' }, { razorpay_order_id: 'pay_1' }, { razorpay_refund_id: 'pay_1' }],
    });
  });

  it('finds the payment through a Razorpay refund we sent for it', async () => {
    m(PaymentModel.find)
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([payment({ metadata: {} })]));
    m(PaymentGatewayRefundModel.find).mockImplementation((filter: Record<string, unknown>) =>
      chain(filter.razorpay_refund_id ? [{ payment_doc_id: DOC }] : [])
    );
    for (const model of [PaymentEventModel, FailedPaymentCaseModel, RazorpayWebhookEventModel, ProductOrderModel, VenueFoodOrderModel]) {
      m(model.find).mockReturnValue(chain([]));
    }

    const trace = await paymentTrace('rfnd_9');

    expect(m(PaymentModel.find).mock.calls[1][0]).toEqual({ _id: { $in: [DOC] } });
    expect(trace.payments).toHaveLength(1);
    expect(trace.payments[0].matched_on).toEqual([]);
  });

  it('lists a venue food order found by its Razorpay id when no payment of ours carries it', async () => {
    answer({
      foodOrders: [{ _id: 'f1', order_no: 'FD-7', venue_name: 'Cafe', status: 'SERVED', payment_status: 'PAID', total_paise: 25050, currency_symbol: '₹', razorpay_payment_id: 'pay_v', razorpay_order_id: 'order_v', razorpay_refund_id: '', created_at: NOW }],
    });
    const trace = await paymentTrace('pay_v');
    expect(trace.found).toBe(true);
    expect(trace.payments).toEqual([]);
    expect(trace.food_orders).toEqual([
      expect.objectContaining({ order_no: 'FD-7', venue_name: 'Cafe', amount: 250.5, razorpay_payment_id: 'pay_v', razorpay_refund_id: null }),
    ]);
  });

  it('says an id nothing carries was not found, and never asks the food or webhook logs for a non-Razorpay id', async () => {
    answer();
    const trace = await paymentTrace('DPAY-NOPE');
    expect(trace).toMatchObject({ ref: 'DPAY-NOPE', found: false, payments: [], events: [], webhooks: [], food_orders: [] });
    expect(VenueFoodOrderModel.find).not.toHaveBeenCalled();
    expect(RazorpayWebhookEventModel.find).not.toHaveBeenCalled();
    // The per-payment logs are asked with an empty $in, which matches nothing.
    expect(m(PaymentEventModel.find).mock.calls[0][0]).toEqual({ payment_doc_id: { $in: [] } });
  });
});
