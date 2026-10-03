// The reconciler only decides WHICH payments to hand the finalizer; the gateway
// and the finalizer are stubbed so these specs pin the selection windows, the
// cursor / attempt bookkeeping and the per-stage fault isolation against a real
// Mongo collection.
const mockCaptured: { job?: { component: string; operation: string; firstDelayMs: number; intervalMs: number; run: () => Promise<unknown> } } = {};
jest.mock('@utils/clusterJob', () => ({
  startClusterJob: jest.fn((job) => {
    mockCaptured.job = job;
    return () => undefined;
  }),
}));
jest.mock('../../razorpay.gateway', () => ({ findCapturedPaymentForOrder: jest.fn() }));
jest.mock('../../payment.finalize', () => ({
  paymentFinalizer: { finalizePayment: jest.fn(), runSideEffects: jest.fn() },
}));
jest.mock('@observability/log', () => ({
  logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));

import { Types } from 'mongoose';
import { PaymentModel } from '../../payment.model';
import { startPaymentReconciler } from '../../payment.reconciler';
import { findCapturedPaymentForOrder } from '../../razorpay.gateway';
import { paymentFinalizer } from '../../payment.finalize';
import { logs } from '@observability/log';

const findCaptured = findCapturedPaymentForOrder as jest.Mock;
const finalizePayment = paymentFinalizer.finalizePayment as jest.Mock;
const runSideEffects = paymentFinalizer.runSideEffects as jest.Mock;
const warn = logs.server.warn as jest.Mock;
const error = logs.server.error as jest.Mock;
const info = logs.server.info as jest.Mock;

const MIN = 60_000;
let seq = 0;

async function sweep(): Promise<void> {
  startPaymentReconciler();
  const job = mockCaptured.job;
  if (!job) throw new Error('the reconciler registered no job');
  await job.run();
}

/** Create a payment then back-date its timestamps through the raw driver
 * (mongoose treats created_at as immutable and would drop the $set). */
async function seedPayment(
  row: Record<string, unknown>,
  ages: { createdAgoMs?: number; updatedAgoMs?: number; checkedAgoMs?: number | null } = {}
) {
  const doc = await PaymentModel.create({
    payment_id: `PAY-REC-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Rec Buyer',
    user_email: `rec${seq}@x.com`,
    subtotal: 500,
    total: 500,
    gateway: 'RAZORPAY',
    ...row,
  });
  const now = Date.now();
  const set: Record<string, unknown> = {
    created_at: new Date(now - (ages.createdAgoMs ?? 10 * MIN)),
    updated_at: new Date(now - (ages.updatedAgoMs ?? 10 * MIN)),
  };
  if (ages.checkedAgoMs !== undefined) {
    set.reconcile_checked_at = ages.checkedAgoMs === null ? null : new Date(now - ages.checkedAgoMs);
  }
  await PaymentModel.collection.updateOne({ _id: doc._id }, { $set: set });
  return doc;
}

const reload = (id: unknown) => PaymentModel.findById(id).lean();

beforeEach(() => {
  findCaptured.mockResolvedValue(null);
  finalizePayment.mockResolvedValue(undefined);
  runSideEffects.mockResolvedValue(undefined);
});

describe('startPaymentReconciler', () => {
  it('registers one cluster job: first sweep after 1 minute, then every 5 minutes', () => {
    startPaymentReconciler();
    expect(mockCaptured.job).toMatchObject({
      component: 'payment-reconciler',
      operation: 'sweep',
      firstDelayMs: MIN,
      intervalMs: 5 * MIN,
    });
  });
});

describe('capture stage', () => {
  it('adopts a captured Razorpay payment: swaps the order id for the payment id and finalizes once', async () => {
    const p = await seedPayment({
      gateway_ref: 'order_A1',
      metadata: { razorpay_account: 'SECONDARY', keep: 'me' },
    });
    findCaptured.mockResolvedValueOnce({ id: 'pay_A1', amount: 50000 });

    await sweep();

    expect(findCaptured).toHaveBeenCalledWith('order_A1', 'SECONDARY');
    const row = await reload(p._id);
    expect(row?.gateway_ref).toBe('pay_A1');
    expect(row?.metadata).toMatchObject({
      keep: 'me',
      razorpay_account: 'SECONDARY',
      razorpay_order_id: 'order_A1',
      razorpay_payment_id: 'pay_A1',
    });
    expect(typeof row?.metadata.reconciled_at).toBe('string');
    expect(row?.reconcile_checked_at).toBeInstanceOf(Date);
    expect(finalizePayment).toHaveBeenCalledTimes(1);
    expect(finalizePayment).toHaveBeenCalledWith(String(p._id), 'Razorpay (reconciled)');
    expect(info).toHaveBeenCalledWith(
      'payment-reconciler',
      'capture',
      expect.objectContaining({ payment_id: p.payment_id, razorpay_payment_id: 'pay_A1', amount_paise: 50000 })
    );
  });

  it('leaves an uncaptured order untouched but still stamps the cursor', async () => {
    const p = await seedPayment({ gateway_ref: 'order_B1' });

    await sweep();

    const row = await reload(p._id);
    expect(row?.gateway_ref).toBe('order_B1');
    expect(row?.metadata.razorpay_payment_id).toBeUndefined();
    expect(row?.reconcile_checked_at).toBeInstanceOf(Date);
    expect(finalizePayment).not.toHaveBeenCalled();
  });

  it('never asks the gateway about a payment with no order id', async () => {
    const p = await seedPayment({ gateway_ref: null });
    await sweep();
    expect(findCaptured).not.toHaveBeenCalled();
    expect((await reload(p._id))?.reconcile_checked_at).toBeInstanceOf(Date);
  });

  it('only looks inside the 5-minute grace / 24-hour window, at PENDING Razorpay rows not checked this sweep', async () => {
    await seedPayment({ gateway_ref: 'order_young' }, { createdAgoMs: 2 * MIN });
    await seedPayment({ gateway_ref: 'order_old' }, { createdAgoMs: 25 * 60 * MIN });
    await seedPayment({ gateway_ref: 'order_dummy', gateway: 'DUMMY' });
    await seedPayment({ gateway_ref: 'order_paid', status: 'SUCCESS' });
    await seedPayment({ gateway_ref: 'order_recent' }, { checkedAgoMs: MIN });
    await seedPayment({ gateway_ref: 'order_due' }, { checkedAgoMs: 6 * MIN });
    await seedPayment({ gateway_ref: 'order_fresh' }, { checkedAgoMs: null });

    await sweep();

    const asked = findCaptured.mock.calls.map((c) => c[0]).sort();
    expect(asked).toEqual(['order_due', 'order_fresh']);
  });

  it('a gateway failure on one payment logs, stamps it, and does not stop the rest of the batch', async () => {
    const bad = await seedPayment({ gateway_ref: 'order_bad' }, { createdAgoMs: 20 * MIN });
    const good = await seedPayment({ gateway_ref: 'order_good' }, { createdAgoMs: 15 * MIN });
    findCaptured.mockImplementation(async (orderId: string) => {
      if (orderId === 'order_bad') throw new Error('razorpay down');
      return { id: 'pay_good', amount: 100 };
    });

    await sweep();

    expect(error).toHaveBeenCalledWith(
      'payment-reconciler',
      'capture',
      expect.objectContaining({ payment_id: bad.payment_id, msg: 'capture recovery failed' })
    );
    expect((await reload(bad._id))?.reconcile_checked_at).toBeInstanceOf(Date);
    expect((await reload(bad._id))?.gateway_ref).toBe('order_bad');
    expect((await reload(good._id))?.gateway_ref).toBe('pay_good');
    expect(finalizePayment).toHaveBeenCalledTimes(1);
  });
});

describe('side-effect stage', () => {
  it('re-runs phase 2 for a stale CORE_DONE payment and counts the attempt without bumping updated_at', async () => {
    const p = await seedPayment(
      { status: 'SUCCESS', finalize_state: 'CORE_DONE', gateway_ref: 'pay_x' },
      { updatedAgoMs: 5 * MIN }
    );
    const before = await reload(p._id);

    await sweep();

    expect(runSideEffects).toHaveBeenCalledWith(String(p._id));
    const row = await reload(p._id);
    expect(row?.side_effect_attempts).toBe(1);
    expect(row?.reconcile_checked_at).toBeInstanceOf(Date);
    expect(row?.updated_at.getTime()).toBe(before?.updated_at.getTime());
    expect(warn).not.toHaveBeenCalledWith('payment-reconciler', 'side-effects', expect.anything());
  });

  it('skips payments still inside the 2-minute grace, out of budget, or checked this sweep', async () => {
    await seedPayment({ finalize_state: 'CORE_DONE', status: 'SUCCESS' }, { updatedAgoMs: MIN });
    await seedPayment({ finalize_state: 'CORE_DONE', status: 'SUCCESS', side_effect_attempts: 6 });
    await seedPayment({ finalize_state: 'CORE_DONE', status: 'SUCCESS' }, { checkedAgoMs: 2 * MIN });
    await seedPayment({ finalize_state: 'COMPLETE', status: 'SUCCESS' });

    await sweep();

    expect(runSideEffects).not.toHaveBeenCalled();
  });

  it('retries a legacy payment that has no side_effect_attempts field at all', async () => {
    const p = await seedPayment({ finalize_state: 'CORE_DONE', status: 'SUCCESS' });
    await PaymentModel.collection.updateOne({ _id: p._id }, { $unset: { side_effect_attempts: '' } });

    await sweep();

    expect(runSideEffects).toHaveBeenCalledWith(String(p._id));
    expect((await reload(p._id))?.side_effect_attempts).toBe(1);
  });

  it('a failing run is logged and still spends the attempt', async () => {
    const p = await seedPayment({ finalize_state: 'CORE_DONE', status: 'SUCCESS', side_effect_attempts: 2 });
    runSideEffects.mockRejectedValueOnce(new Error('shiprocket 401'));

    await sweep();

    expect(error).toHaveBeenCalledWith(
      'payment-reconciler',
      'side-effects',
      expect.objectContaining({ payment_id: p.payment_id, msg: 'side-effect retry failed' })
    );
    expect((await reload(p._id))?.side_effect_attempts).toBe(3);
  });

  it('the sixth attempt that still leaves CORE_DONE warns a human once', async () => {
    const p = await seedPayment({ finalize_state: 'CORE_DONE', status: 'SUCCESS', side_effect_attempts: 5 });

    await sweep();

    expect((await reload(p._id))?.side_effect_attempts).toBe(6);
    expect(warn).toHaveBeenCalledWith(
      'payment-reconciler',
      'side-effects',
      expect.objectContaining({ payment_id: p.payment_id, payment_doc_id: String(p._id), attempts: 6 })
    );

    // Out of budget now: the next sweep leaves it alone entirely.
    runSideEffects.mockClear();
    warn.mockClear();
    await PaymentModel.collection.updateOne({ _id: p._id }, { $set: { reconcile_checked_at: null } });
    await sweep();
    expect(runSideEffects).not.toHaveBeenCalled();
  });

  it('does not warn when the last attempt finally completed the payment', async () => {
    const p = await seedPayment({ finalize_state: 'CORE_DONE', status: 'SUCCESS', side_effect_attempts: 5 });
    runSideEffects.mockImplementationOnce(async (id: string) => {
      await PaymentModel.updateOne({ _id: id }, { $set: { finalize_state: 'COMPLETE' } });
    });

    await sweep();

    expect((await reload(p._id))?.finalize_state).toBe('COMPLETE');
    expect(warn).not.toHaveBeenCalledWith('payment-reconciler', 'side-effects', expect.anything());
  });
});

describe('needs-human stage', () => {
  it('reports the FAILED and needs_refund counts Finance has to decide on', async () => {
    await seedPayment({ finalize_state: 'FAILED', status: 'SUCCESS', needs_refund: true });
    await seedPayment({ finalize_state: 'COMPLETE', status: 'SUCCESS', needs_refund: true });
    await seedPayment({ finalize_state: 'COMPLETE', status: 'SUCCESS' });

    await sweep();

    expect(warn).toHaveBeenCalledWith(
      'payment-reconciler',
      'needs-human',
      expect.objectContaining({ failed: 1, needs_refund: 2 })
    );
  });

  it('stays silent when nothing is waiting on Finance', async () => {
    await seedPayment({ finalize_state: 'COMPLETE', status: 'SUCCESS' });
    await sweep();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('stage isolation', () => {
  it('a crashing capture stage is logged and the side-effect and needs-human stages still run', async () => {
    const p = await seedPayment({ finalize_state: 'CORE_DONE', status: 'SUCCESS', needs_refund: true });
    const spy = jest.spyOn(PaymentModel, 'find').mockImplementationOnce(() => {
      throw new Error('mongo blip');
    });

    await sweep();
    spy.mockRestore();

    expect(error).toHaveBeenCalledWith(
      'payment-reconciler',
      'captures',
      expect.objectContaining({ msg: 'stage failed' })
    );
    expect(runSideEffects).toHaveBeenCalledWith(String(p._id));
    expect(warn).toHaveBeenCalledWith('payment-reconciler', 'needs-human', expect.objectContaining({ needs_refund: 1 }));
  });
});
