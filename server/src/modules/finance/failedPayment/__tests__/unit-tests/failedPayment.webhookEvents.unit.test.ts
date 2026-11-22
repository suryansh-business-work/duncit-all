/**
 * What each Razorpay event does once its signature is proven: payment.failed
 * opens/updates the case, payment.captured is only recorded (the reconciler
 * books), refund events finish OUR refunds and nobody else's.
 */
jest.mock('@modules/finance/payment/payment.model', () => ({ PaymentModel: { findOne: jest.fn() } }));
jest.mock('../../failedPaymentCase.model', () => ({
  FailedPaymentCaseModel: { findOne: jest.fn(), findById: jest.fn() },
}));
jest.mock('../../failedPaymentCase.service', () => ({
  isCaseEligible: (p: { gateway: string; target_type: string }) => p.gateway === 'RAZORPAY' && p.target_type === 'POD',
  upsertCaseForPayment: jest.fn(),
}));
jest.mock('../../failedPayment.refundOutcome', () => ({ completeRefund: jest.fn(), failRefund: jest.fn() }));
jest.mock('../../paymentEvent.service', () => ({ recordPaymentEvent: jest.fn().mockResolvedValue(true) }));
jest.mock('../../failedPayment.refund', () => ({ receiptPrefix: (id: string) => `fpc_${id}` }));

import { PaymentModel } from '@modules/finance/payment/payment.model';
import { FailedPaymentCaseModel } from '../../failedPaymentCase.model';
import { upsertCaseForPayment } from '../../failedPaymentCase.service';
import { completeRefund, failRefund } from '../../failedPayment.refundOutcome';
import { recordPaymentEvent } from '../../paymentEvent.service';
import { applyRazorpayEvent, summarize } from '../../failedPayment.webhookEvents';

const m = (fn: unknown) => fn as jest.Mock;
const CASE_ID = '65aa00000000000000000001';

const paymentEvent = (event: string, entity: Record<string, unknown>) => ({ event, payload: { payment: { entity } } });
const refundEvent = (event: string, entity: Record<string, unknown>) => ({ event, payload: { refund: { entity } } });

const podPayment = { _id: 'pdoc', gateway: 'RAZORPAY', target_type: 'POD' };

beforeEach(() => {
  jest.clearAllMocks();
  m(PaymentModel.findOne).mockResolvedValue(podPayment);
  m(upsertCaseForPayment).mockResolvedValue({ _id: CASE_ID });
  m(FailedPaymentCaseModel.findOne).mockReturnValue({ select: () => ({ lean: async () => ({ _id: CASE_ID }) }) });
});

describe('payment.failed', () => {
  const failed = paymentEvent('payment.failed', {
    id: 'pay_1',
    order_id: 'order_1',
    error_code: 'BAD_REQUEST_ERROR',
    error_description: 'Declined',
    error_reason: 'payment_failed',
    error_source: 'bank',
    error_step: 'payment_authorization',
  });

  it('finds the payment by its order and opens the case with Razorpay error', async () => {
    await expect(applyRazorpayEvent(failed, 'evt_1')).resolves.toBe('APPLIED');
    expect(PaymentModel.findOne).toHaveBeenCalledWith({ gateway: 'RAZORPAY', 'metadata.razorpay_order_id': 'order_1' });
    expect(upsertCaseForPayment).toHaveBeenCalledWith(podPayment, {
      source: 'WEBHOOK',
      countAttempt: true,
      razorpayPaymentId: 'pay_1',
      error: expect.objectContaining({ code: 'BAD_REQUEST_ERROR', reason: 'payment_failed', reported_by: 'WEBHOOK' }),
    });
    expect(recordPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WEBHOOK_PAYMENT_FAILED', caseId: CASE_ID, dedupeKey: 'webhook:evt_1' })
    );
  });

  it('only records the event for a product or gift-card payment (no case)', async () => {
    m(PaymentModel.findOne).mockResolvedValue({ ...podPayment, target_type: 'PRODUCT' });
    await applyRazorpayEvent(failed, 'evt_1');
    expect(upsertCaseForPayment).not.toHaveBeenCalled();
    expect(recordPaymentEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'WEBHOOK_PAYMENT_FAILED', caseId: undefined }));
  });

  it('ignores an order this system never created', async () => {
    m(PaymentModel.findOne).mockResolvedValue(null);
    await expect(applyRazorpayEvent(failed, 'evt_1')).resolves.toBe('IGNORED');
    expect(recordPaymentEvent).not.toHaveBeenCalled();
  });
});

describe('payment.captured', () => {
  it('records the capture and never books or touches the case', async () => {
    await applyRazorpayEvent(paymentEvent('payment.captured', { id: 'pay_1', order_id: 'order_1', amount: 49900 }), 'evt_2');
    expect(recordPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WEBHOOK_PAYMENT_CAPTURED', data: { razorpay_payment_id: 'pay_1', amount_paise: 49900 } })
    );
    expect(upsertCaseForPayment).not.toHaveBeenCalled();
    expect(completeRefund).not.toHaveBeenCalled();
  });
});

describe('refund events', () => {
  const ourCase = (refundId = 'rfnd_1') => ({ _id: CASE_ID, refund: { razorpay_refund_id: refundId } });

  it('completes our refund found by its receipt', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(ourCase());
    await applyRazorpayEvent(refundEvent('refund.processed', { id: 'rfnd_1', receipt: `fpc_${CASE_ID}_1` }), 'evt_3');
    expect(FailedPaymentCaseModel.findById).toHaveBeenCalledWith(CASE_ID);
    expect(completeRefund).toHaveBeenCalledWith(CASE_ID, 'rfnd_1', 'WEBHOOK');
  });

  it('falls back to the refund id when the receipt is not ours', async () => {
    m(FailedPaymentCaseModel.findOne).mockResolvedValue(ourCase());
    await applyRazorpayEvent(refundEvent('refund.failed', { id: 'rfnd_1', receipt: 'ORD-77' }), 'evt_4');
    expect(FailedPaymentCaseModel.findOne).toHaveBeenCalledWith({ 'refund.razorpay_refund_id': 'rfnd_1' });
    expect(failRefund).toHaveBeenCalledWith(CASE_ID, expect.any(String), 'WEBHOOK');
  });

  it('ignores a pod-shop or pet-store refund', async () => {
    m(FailedPaymentCaseModel.findOne).mockResolvedValue(null);
    await expect(applyRazorpayEvent(refundEvent('refund.processed', { id: 'rfnd_9', receipt: 'ORD-9' }), 'e')).resolves.toBe('IGNORED');
    expect(completeRefund).not.toHaveBeenCalled();
  });

  it('does not let a failure of an older attempt fail the current refund', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(ourCase('rfnd_new'));
    const outcome = await applyRazorpayEvent(refundEvent('refund.failed', { id: 'rfnd_old', receipt: `fpc_${CASE_ID}_1` }), 'e');
    expect(outcome).toBe('IGNORED');
    expect(failRefund).not.toHaveBeenCalled();
  });
});

it('ignores events it does not handle', async () => {
  await expect(applyRazorpayEvent({ event: 'order.paid' }, 'e')).resolves.toBe('IGNORED');
  expect(recordPaymentEvent).not.toHaveBeenCalled();
});

describe('summarize', () => {
  it('keeps ids, status, amount and the error, and nothing about the buyer', () => {
    const summary = summarize(
      paymentEvent('payment.failed', {
        id: 'pay_1',
        order_id: 'order_1',
        status: 'failed',
        amount: 49900,
        error_code: 'BAD_REQUEST_ERROR',
        email: 'buyer@example.com',
        contact: '+919999999999',
        card: { last4: '4242' },
        vpa: 'buyer@upi',
      })
    );
    expect(summary).toMatchObject({ event: 'payment.failed', payment_id: 'pay_1', order_id: 'order_1', amount: 49900, error_code: 'BAD_REQUEST_ERROR' });
    expect(JSON.stringify(summary)).not.toMatch(/buyer@|9999999999|4242/);
  });
});
