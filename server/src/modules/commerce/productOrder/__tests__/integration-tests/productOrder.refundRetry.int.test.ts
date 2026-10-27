jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));
jest.mock('@modules/finance/payment/payment.refundRecord', () => ({
  creditCoinsBack: jest.fn(),
  recordPaymentRefund: jest.fn(),
}));
jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  createRazorpayRefund: jest.fn(),
  listRazorpayRefunds: jest.fn(),
}));

import { Types } from 'mongoose';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { createRazorpayRefund, listRazorpayRefunds } from '@modules/finance/payment/razorpay.gateway';
import { ProductOrderModel } from '../../productOrder.model';
import { retryRefund } from '../../productOrder.refund';

/**
 * Retrying a pod-shop refund against a real collection: the claim is a
 * conditional write, so two operators pressing Retry at once must send ONE
 * refund to Razorpay, and a refund that may still be on the wire is never sent
 * again. Only the gateway and the Finance ledger are mocked.
 */

const mockCreate = createRazorpayRefund as jest.Mock;
const mockList = listRazorpayRefunds as jest.Mock;
let seq = 0;

const seed = async (refund: Record<string, unknown>) => {
  seq += 1;
  const payment = await PaymentModel.create({
    payment_id: `pay-retry-${seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: 'asha@x.com',
    subtotal: 300,
    total: 300,
    currency_symbol: '₹',
    gateway: 'RAZORPAY',
    status: 'SUCCESS',
    metadata: { razorpay_payment_id: `pay_rzp_${seq}` },
  });
  const order = await ProductOrderModel.create({
    order_no: `ord_retry_${seq}`,
    payment_id: payment._id,
    buyer_name: 'Asha',
    buyer_email: 'asha@x.com',
    items_total: 300,
    total: 300,
    fulfilment_method: 'SHIP',
    fulfilment_status: 'CANCELLED',
    cancelled_at: new Date(),
    line_items: [{ product_id: new Types.ObjectId(), name: 'Leash', qty: 1, unit_cost: 300, gross: 300 }],
    refund: { amount: 300, coins: 0, initiated_by: 'POD_SHOP_ADMIN_CANCEL', finance_recorded: true, ...refund },
  });
  return { payment, order };
};

const requestFor = (order: { order_no: string }, paymentId: unknown) => ({
  paymentId,
  gross: 300,
  receipt: order.order_no,
  reason: `Order ${order.order_no} cancelled: changed mind`,
  initiatedBy: 'POD_SHOP_ADMIN_CANCEL',
});

const load = async (id: unknown) => {
  const doc = await ProductOrderModel.findById(id);
  if (!doc) throw new Error('seeded order vanished');
  return doc;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue([]);
});

describe('retryRefund — claimed through the collection', () => {
  it('sends exactly one Razorpay refund when two retries of a FAILED refund race', async () => {
    const { payment, order } = await seed({ status: 'FAILED', error: 'Insufficient balance', attempted_at: new Date(0) });
    // Slow gateway: both retries are past their first read before either is answered.
    mockCreate.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: 'rfnd_once' }), 50))
    );
    const [a, b] = await Promise.all([load(order._id), load(order._id)]);

    const results = await Promise.allSettled([
      retryRefund(a, requestFor(order, payment._id), ProductOrderModel),
      retryRefund(b, requestFor(order, payment._id), ProductOrderModel),
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const refused = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(refused.reason.message).toMatch(/may still be on its way/);
    const stored = await load(order._id);
    expect(stored.refund).toMatchObject({ status: 'PROCESSED', razorpay_refund_id: 'rfnd_once', error: '' });
  });

  it('refuses a PENDING refund that may still be in flight and leaves it untouched', async () => {
    const attemptedAt = new Date(Date.now() - 60_000);
    const { payment, order } = await seed({ status: 'PENDING', attempted_at: attemptedAt });

    await expect(
      retryRefund(await load(order._id), requestFor(order, payment._id), ProductOrderModel)
    ).rejects.toThrow(/may still be on its way/);

    expect(mockList).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    const stored = await load(order._id);
    expect(stored.refund.status).toBe('PENDING');
    expect(stored.refund.attempted_at?.getTime()).toBe(attemptedAt.getTime());
  });

  it('refuses a PENDING refund that never recorded an attempt', async () => {
    const { payment, order } = await seed({ status: 'PENDING', attempted_at: null });
    await expect(
      retryRefund(await load(order._id), requestFor(order, payment._id), ProductOrderModel)
    ).rejects.toThrow(/may still be on its way/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('recovers a PENDING refund abandoned by a crash by adopting the refund Razorpay already holds', async () => {
    const { payment, order } = await seed({
      status: 'PENDING',
      attempted_at: new Date(Date.now() - 20 * 60_000),
    });
    mockList.mockResolvedValue([{ id: 'rfnd_sent_before', receipt: order.order_no }]);

    const out = await retryRefund(await load(order._id), requestFor(order, payment._id), ProductOrderModel);

    expect(mockList).toHaveBeenCalledWith(`pay_rzp_${seq}`, null);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(out).toMatchObject({ status: 'PROCESSED', razorpay_refund_id: 'rfnd_sent_before' });
    expect((await load(order._id)).refund.status).toBe('PROCESSED');
  });
});
