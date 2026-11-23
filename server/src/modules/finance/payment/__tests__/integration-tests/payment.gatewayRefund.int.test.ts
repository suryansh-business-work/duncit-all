jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  createRazorpayRefund: jest.fn(),
  listRazorpayRefunds: jest.fn(),
}));

import { Types } from 'mongoose';
import { createRazorpayRefund, listRazorpayRefunds } from '@modules/finance/payment/razorpay.gateway';
import { PaymentModel } from '../../payment.model';
import { PaymentGatewayRefundModel } from '../../payment.gatewayRefund.model';
import { PaymentEventModel } from '@modules/finance/failedPayment/paymentEvent.model';
import {
  GATEWAY_REFUND_MAX_ATTEMPTS,
  applyRazorpayRefund,
  processGatewayRefund,
  publicRefundStatus,
  queueGatewayRefund,
  runGatewayRefundSweep,
} from '../../payment.gatewayRefund';

/**
 * A pod payment's refund sent back through Razorpay at most once. Razorpay is
 * faked: no test here can move real money.
 */
const create = createRazorpayRefund as jest.Mock;
const list = listRazorpayRefunds as jest.Mock;

let seq = 0;
const makePayment = (over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `DPAY-GR-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: 'asha@x.com',
    billing_address: 'address line',
    checkout_url: 'https://app/checkout',
    target_type: 'POD',
    pod_id: new Types.ObjectId(),
    description: 'Pod booking',
    subtotal: 30.51,
    total: 36,
    currency_symbol: '₹',
    status: 'REFUNDED',
    gateway: 'RAZORPAY',
    gateway_ref: `pay_rzp${seq}`,
    metadata: { razorpay_payment_id: `pay_rzp${seq}`, razorpay_order_id: `order_${seq}` },
    ...over,
  });

const queue = (payment: Awaited<ReturnType<typeof makePayment>>, amount = 36, key = `pod_cancel:${String(payment._id)}`) =>
  queueGatewayRefund({ payment, amount, key, source: 'POD_CANCELLATION', reason: 'Minimum bookings not met', initiatedBy: 'SYSTEM' });

const metaOf = async (id: unknown) => (await PaymentModel.findById(id).lean())?.metadata as Record<string, unknown>;

beforeEach(() => {
  create.mockReset();
  list.mockReset().mockResolvedValue([]);
});

describe('queueGatewayRefund', () => {
  it('records a test-gateway payment as NOT_APPLICABLE and never calls Razorpay', async () => {
    const payment = await makePayment({ gateway: 'DUMMY', gateway_ref: 'dummy_1', metadata: {} });
    const record = await queue(payment);
    expect(record).toMatchObject({ status: 'NOT_APPLICABLE', amount_paise: 3600 });
    expect(await processGatewayRefund(record!._id)).toMatchObject({ status: 'NOT_APPLICABLE' });
    expect(create).not.toHaveBeenCalled();
    expect((await metaOf(payment._id)).refund_gateway_status).toBe('NOT_APPLICABLE');
  });

  it('hands a Razorpay payment with no recorded payment id to Finance instead of skipping it', async () => {
    const payment = await makePayment({ gateway_ref: 'order_only', metadata: { razorpay_order_id: 'order_only' } });
    const record = await queue(payment);
    expect(record).toMatchObject({ status: 'RECONCILIATION_REQUIRED' });
    expect(record?.last_error).toMatch(/no razorpay payment id/i);
  });

  it('queues one record per business event, however many times the cancel runs', async () => {
    const payment = await makePayment();
    const first = await queue(payment);
    const again = await queue(payment, 99);
    expect(String(again!._id)).toBe(String(first!._id));
    expect(again?.amount_paise).toBe(3600);
    expect(await PaymentGatewayRefundModel.countDocuments({ payment_doc_id: payment._id })).toBe(1);
  });

  it('queues nothing for a zero refund', async () => {
    expect(await queue(await makePayment(), 0)).toBeNull();
  });
});

describe('processGatewayRefund', () => {
  it('sends once with an integer-paise amount and our receipt, and records the processed refund on the payment', async () => {
    const payment = await makePayment();
    const record = await queue(payment);
    create.mockResolvedValue({ id: 'rfnd_1', status: 'processed', amount: 3600, receipt: `dr_${record!._id}_1` });

    const done = await processGatewayRefund(record!._id);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: payment.metadata.razorpay_payment_id, amountPaise: 3600, receipt: `dr_${record!._id}_1` })
    );
    expect(done).toMatchObject({ status: 'SUCCEEDED', razorpay_refund_id: 'rfnd_1', attempts: 1 });
    const meta = await metaOf(payment._id);
    expect(meta.refund_gateway_status).toBe('SUCCEEDED');
    expect(meta.razorpay_refund_ids).toEqual(['rfnd_1']);
    expect(await PaymentEventModel.countDocuments({ payment_doc_id: payment._id, type: 'REFUND_PROCESSED' })).toBe(1);

    // A second send (a double click, the sweep) finds it finished and sends nothing.
    await processGatewayRefund(record!._id);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('adopts a refund that already reached Razorpay instead of sending a second one', async () => {
    const payment = await makePayment();
    const record = await queue(payment);
    list.mockResolvedValue([{ id: 'rfnd_lost', status: 'pending', amount: 3600, receipt: `dr_${record!._id}_1` }]);

    const done = await processGatewayRefund(record!._id);

    expect(create).not.toHaveBeenCalled();
    expect(done).toMatchObject({ status: 'PROCESSING', razorpay_refund_id: 'rfnd_lost' });
    expect(publicRefundStatus(await metaOf(payment._id))).toBe('PROCESSING');
  });

  it('keeps a failed send for a retry with back-off, then hands it to Finance once the retries are used up', async () => {
    const payment = await makePayment();
    const record = await queue(payment);
    create.mockRejectedValue(new Error('Razorpay refund failed: gateway timeout'));

    const failed = await processGatewayRefund(record!._id);
    expect(failed).toMatchObject({ status: 'FAILED', attempts: 1, last_error: 'Razorpay refund failed: gateway timeout' });
    expect(failed!.next_attempt_at!.getTime()).toBeGreaterThan(Date.now());
    expect(publicRefundStatus(await metaOf(payment._id))).toBe('FAILED');

    for (let attempt = 2; attempt <= GATEWAY_REFUND_MAX_ATTEMPTS; attempt += 1) await processGatewayRefund(record!._id);
    const stuck = await PaymentGatewayRefundModel.findById(record!._id);
    expect(stuck).toMatchObject({ status: 'RECONCILIATION_REQUIRED', attempts: GATEWAY_REFUND_MAX_ATTEMPTS });
    // Every retry looked for a refund that might have gone through first.
    expect(list).toHaveBeenCalledTimes(GATEWAY_REFUND_MAX_ATTEMPTS);
    await processGatewayRefund(record!._id);
    expect(create).toHaveBeenCalledTimes(GATEWAY_REFUND_MAX_ATTEMPTS);
  });
});

describe('applyRazorpayRefund — the webhook and the poller', () => {
  it('moves a processing refund to SUCCEEDED and never lets a late failure report undo it', async () => {
    const payment = await makePayment();
    const record = await queue(payment);
    create.mockResolvedValue({ id: 'rfnd_2', status: 'pending', amount: 3600, receipt: `dr_${record!._id}_1` });
    await processGatewayRefund(record!._id);

    await applyRazorpayRefund(record!._id, { id: 'rfnd_2', status: 'processed', amount: 3600, receipt: '' }, 'WEBHOOK');
    await applyRazorpayRefund(record!._id, { id: 'rfnd_2', status: 'failed', amount: 3600, receipt: '' }, 'WEBHOOK');

    const after = await PaymentGatewayRefundModel.findById(record!._id);
    expect(after).toMatchObject({ status: 'SUCCEEDED', razorpay_refund_id: 'rfnd_2' });
    expect(after?.processed_at).toBeInstanceOf(Date);
    expect(publicRefundStatus(await metaOf(payment._id))).toBe('SUCCEEDED');
  });
});

describe('runGatewayRefundSweep', () => {
  it('sends what is queued and asks Razorpay about a refund the webhook never confirmed', async () => {
    const queuedPayment = await makePayment();
    const queued = await queue(queuedPayment);
    const waitingPayment = await makePayment();
    const waiting = await queue(waitingPayment);
    await PaymentGatewayRefundModel.updateOne(
      { _id: waiting!._id },
      { $set: { status: 'PROCESSING', razorpay_refund_id: 'rfnd_wait', next_attempt_at: new Date(Date.now() - 1000) } }
    );
    create.mockResolvedValue({ id: 'rfnd_q', status: 'processed', amount: 3600, receipt: `dr_${queued!._id}_1` });
    list.mockImplementation(async (paymentId: string) =>
      paymentId === waitingPayment.metadata.razorpay_payment_id
        ? [{ id: 'rfnd_wait', status: 'processed', amount: 3600, receipt: `dr_${waiting!._id}_1` }]
        : []
    );

    expect(await runGatewayRefundSweep()).toBe(2);
    expect(await PaymentGatewayRefundModel.findById(queued!._id)).toMatchObject({ status: 'SUCCEEDED' });
    expect(await PaymentGatewayRefundModel.findById(waiting!._id)).toMatchObject({ status: 'SUCCEEDED' });
  });

  it('leaves a failed refund alone until its back-off has passed', async () => {
    const record = await queue(await makePayment());
    await PaymentGatewayRefundModel.updateOne(
      { _id: record!._id },
      { $set: { status: 'FAILED', attempts: 1, next_attempt_at: new Date(Date.now() + 60_000) } }
    );
    expect(await runGatewayRefundSweep()).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('publicRefundStatus', () => {
  it('reads queued and in-flight as REQUESTED, passes the end states through, and null when nothing was sent', () => {
    expect(publicRefundStatus({ refund_gateway_status: 'QUEUED' })).toBe('REQUESTED');
    expect(publicRefundStatus({ refund_gateway_status: 'SENDING' })).toBe('REQUESTED');
    expect(publicRefundStatus({ refund_gateway_status: 'SUCCEEDED' })).toBe('SUCCEEDED');
    expect(publicRefundStatus({ refund_gateway_status: 'RECONCILIATION_REQUIRED' })).toBe('RECONCILIATION_REQUIRED');
    expect(publicRefundStatus({ refund_gateway_status: 'BOGUS' })).toBeNull();
    expect(publicRefundStatus({})).toBeNull();
    expect(publicRefundStatus(null)).toBeNull();
  });
});
