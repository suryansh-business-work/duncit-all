/**
 * The shared capture adopter behind the `payment.captured` webhook and the
 * reconciler: which payments it will touch, that it asks Razorpay instead of
 * trusting the caller, that its write is conditional (a verify or a refund that
 * got there first wins), and that phase 2 starts straight away.
 */
jest.mock('../../payment.model', () => ({ PaymentModel: { updateOne: jest.fn() } }));
jest.mock('../../razorpay.gateway', () => ({ findCapturedPaymentForOrder: jest.fn() }));
jest.mock('../../payment.finalize', () => ({
  paymentFinalizer: { finalizePayment: jest.fn(), runSideEffects: jest.fn() },
}));
jest.mock('@modules/finance/failedPayment/failedPaymentCase.service', () => ({ markCaseBooked: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } } }));

import { PaymentModel } from '../../payment.model';
import { findCapturedPaymentForOrder } from '../../razorpay.gateway';
import { paymentFinalizer } from '../../payment.finalize';
import { markCaseBooked } from '@modules/finance/failedPayment/failedPaymentCase.service';
import { logs } from '@observability/log';
import { adoptRazorpayCapture, isAdoptable } from '../../payment.capture';
import { razorpayOrderIdOf } from '../../payment.gatewayIds';

const m = (fn: unknown) => fn as jest.Mock;
const DOC_ID = '65bb00000000000000000001';

const doc = (over: Record<string, unknown> = {}) =>
  ({
    _id: DOC_ID,
    payment_id: 'pay_mwinternal0001',
    status: 'PENDING',
    gateway: 'RAZORPAY',
    finalize_state: 'NOT_STARTED',
    gateway_ref: 'order_A1',
    metadata: { razorpay_order_id: 'order_A1', razorpay_account: 'acct_2' },
    ...over,
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  m(findCapturedPaymentForOrder).mockResolvedValue({ id: 'pay_RZP1', amount: 49900 });
  m(PaymentModel.updateOne).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  m(paymentFinalizer.finalizePayment).mockResolvedValue(undefined);
  m(paymentFinalizer.runSideEffects).mockResolvedValue(undefined);
});

describe('razorpayOrderIdOf', () => {
  it('prefers the order id kept in metadata', () => {
    expect(razorpayOrderIdOf({ gateway_ref: 'pay_RZP1', metadata: { razorpay_order_id: 'order_A1' } })).toBe('order_A1');
  });

  it('falls back to an order id still in gateway_ref', () => {
    expect(razorpayOrderIdOf({ gateway_ref: 'order_B2', metadata: {} })).toBe('order_B2');
  });

  it('answers empty when only a payment id is known, or nothing at all', () => {
    expect(razorpayOrderIdOf({ gateway_ref: 'pay_RZP1', metadata: {} })).toBe('');
    expect(razorpayOrderIdOf({ gateway_ref: null, metadata: {} })).toBe('');
  });
});

describe('isAdoptable', () => {
  it('accepts a PENDING Razorpay payment with no booking yet', () => {
    expect(isAdoptable(doc())).toBe(true);
  });

  it.each([
    ['settled', { status: 'SUCCESS' }],
    ['not Razorpay', { gateway: 'DUMMY' }],
    ['already booked', { finalize_state: 'CORE_DONE' }],
    ['finished', { finalize_state: 'COMPLETE' }],
    ['failed and owed a refund', { finalize_state: 'FAILED' }],
    ['being refunded', { metadata: { razorpay_order_id: 'order_A1', failed_payment_refund_case: 'case1' } }],
  ])('refuses a payment that is %s', (_label, over) => {
    expect(isAdoptable(doc(over))).toBe(false);
  });
});

describe('adoptRazorpayCapture', () => {
  it('asks Razorpay with the payment\'s own account, writes the capture conditionally, then books and starts phase 2', async () => {
    await expect(adoptRazorpayCapture(doc(), 'WEBHOOK')).resolves.toBe(true);

    expect(findCapturedPaymentForOrder).toHaveBeenCalledWith('order_A1', 'acct_2');
    expect(PaymentModel.updateOne).toHaveBeenCalledWith(
      {
        _id: DOC_ID,
        status: 'PENDING',
        finalize_state: { $nin: ['CORE_DONE', 'COMPLETE', 'FAILED'] },
        gateway_ref: { $in: ['order_A1', 'pay_RZP1'] },
        'metadata.failed_payment_refund_case': { $exists: false },
      },
      {
        $set: expect.objectContaining({
          gateway_ref: 'pay_RZP1',
          'metadata.razorpay_order_id': 'order_A1',
          'metadata.razorpay_payment_id': 'pay_RZP1',
          'metadata.adopted_by': 'WEBHOOK',
        }),
      }
    );
    expect(paymentFinalizer.finalizePayment).toHaveBeenCalledWith(DOC_ID, 'Razorpay (reconciled)');
    expect(paymentFinalizer.runSideEffects).toHaveBeenCalledWith(DOC_ID);
    expect(markCaseBooked).toHaveBeenCalledWith(DOC_ID);
  });

  it('books nothing when Razorpay holds no capture for the order', async () => {
    m(findCapturedPaymentForOrder).mockResolvedValue(null);
    await expect(adoptRazorpayCapture(doc(), 'RECONCILER')).resolves.toBe(false);
    expect(PaymentModel.updateOne).not.toHaveBeenCalled();
    expect(paymentFinalizer.finalizePayment).not.toHaveBeenCalled();
  });

  it('books nothing when the conditional write loses to a verify, a refund or another adopter', async () => {
    m(PaymentModel.updateOne).mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    await expect(adoptRazorpayCapture(doc(), 'WEBHOOK')).resolves.toBe(false);
    expect(paymentFinalizer.finalizePayment).not.toHaveBeenCalled();
    expect(markCaseBooked).not.toHaveBeenCalled();
  });

  it('never asks Razorpay about a payment it may not adopt, or one with no order id', async () => {
    await expect(adoptRazorpayCapture(doc({ finalize_state: 'FAILED' }), 'WEBHOOK')).resolves.toBe(false);
    await expect(adoptRazorpayCapture(doc({ gateway_ref: 'pay_x', metadata: {} }), 'WEBHOOK')).resolves.toBe(false);
    expect(findCapturedPaymentForOrder).not.toHaveBeenCalled();
  });

  it('a failing phase 2 is logged and does not undo the adoption', async () => {
    m(paymentFinalizer.runSideEffects).mockRejectedValue(new Error('smtp down'));
    await expect(adoptRazorpayCapture(doc(), 'WEBHOOK')).resolves.toBe(true);
    await new Promise((resolve) => setImmediate(resolve));
    expect(logs.server.error).toHaveBeenCalledWith('payment-capture', 'WEBHOOK', expect.objectContaining({ payment_id: 'pay_mwinternal0001' }));
  });

  it('lets a finalizer failure reach the caller (the webhook logs it, the reconciler stamps and moves on)', async () => {
    m(paymentFinalizer.finalizePayment).mockRejectedValue(new Error('Pod is full'));
    await expect(adoptRazorpayCapture(doc(), 'RECONCILER')).rejects.toThrow('Pod is full');
    expect(markCaseBooked).not.toHaveBeenCalled();
  });
});
