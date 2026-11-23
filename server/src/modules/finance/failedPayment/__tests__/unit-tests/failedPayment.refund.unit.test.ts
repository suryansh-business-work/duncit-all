/**
 * Finance's Refund button on a failed payment: eligibility, the one-winner
 * claim, the live Razorpay guard (booking, capture, amount left) and the
 * crash-safe send that never creates a second refund. Models, gateway and the
 * outcome handlers are mocked; the outcome handlers have their own suite.
 */
jest.mock('../../failedPaymentCase.model', () => ({
  FailedPaymentCaseModel: { findById: jest.fn(), findOneAndUpdate: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('@modules/finance/payment/payment.model', () => ({
  PaymentModel: { findById: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  createRazorpayRefund: jest.fn(),
  fetchRazorpayOrderPayments: jest.fn(),
  fetchRazorpayPayment: jest.fn(),
  listRazorpayRefunds: jest.fn(),
}));
jest.mock('../../failedPayment.booking', () => ({ bookingFor: jest.fn() }));
jest.mock('../../failedPayment.refundOutcome', () => ({ completeRefund: jest.fn(), failRefund: jest.fn() }));
jest.mock('../../paymentEvent.service', () => ({ recordPaymentEvent: jest.fn().mockResolvedValue(true) }));

import { FailedPaymentCaseModel } from '../../failedPaymentCase.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import {
  createRazorpayRefund,
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  listRazorpayRefunds,
} from '@modules/finance/payment/razorpay.gateway';
import { bookingFor } from '../../failedPayment.booking';
import { completeRefund, failRefund } from '../../failedPayment.refundOutcome';
import { recordPaymentEvent } from '../../paymentEvent.service';
import { SYSTEM_ACTOR } from '../../failedPayment.types';
import {
  claimAndSend,
  initiateFailedPaymentRefund,
  liveRefundCheck,
  refundBasis,
  refundEligibility,
  refundGuard,
  RefundRefusal,
} from '../../failedPayment.refund';

const m = (fn: unknown) => fn as jest.Mock;
const CASE_ID = '65aa00000000000000000001';
const actor = { id: '65aa00000000000000000099', name: 'Fin Manager', roles: ['FINANCE_MANAGER'] };

const kase = (over: Record<string, unknown> = {}) =>
  ({
    _id: CASE_ID,
    payment_doc_id: '65aa00000000000000000002',
    payment_id: 'PAY-1',
    razorpay_order_id: 'order_1',
    resolution: { state: 'OPEN' },
    verification: { status: 'MATCHED', matched_payment_id: 'pay_1' },
    review: null,
    refund: { status: '', client_request_id: '', attempts: 0, razorpay_refund_id: '' },
    ...over,
  }) as never;

const claimed = (over: Record<string, unknown> = {}) =>
  kase({ refund: { status: 'PENDING', client_request_id: 'req-12345678', attempts: 1, razorpay_refund_id: '' }, ...over });

const live = (over: Record<string, unknown> = {}) => ({
  id: 'pay_1',
  status: 'captured',
  amount: 49900,
  amount_refunded: 0,
  order_id: 'order_1',
  references: [],
  error_code: '',
  error_description: '',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  m(FailedPaymentCaseModel.findById).mockResolvedValue(kase());
  m(FailedPaymentCaseModel.findOneAndUpdate).mockResolvedValue(claimed());
  m(FailedPaymentCaseModel.updateOne).mockResolvedValue({ modifiedCount: 1 });
  m(PaymentModel.findById).mockResolvedValue({ _id: '65aa00000000000000000002', metadata: { razorpay_account: 'acct_1' } });
  m(PaymentModel.updateOne).mockResolvedValue({ modifiedCount: 1 });
  m(bookingFor).mockResolvedValue({ exists: false, bookedRazorpayPaymentId: null });
  m(fetchRazorpayPayment).mockResolvedValue(live());
  m(listRazorpayRefunds).mockResolvedValue([]);
  m(createRazorpayRefund).mockResolvedValue({ id: 'rfnd_1', status: 'processed', amount: 49900, receipt: `fpc_${CASE_ID}_1` });
  m(completeRefund).mockResolvedValue(kase({ refund: { status: 'PROCESSED' } }));
  m(failRefund).mockResolvedValue(kase({ refund: { status: 'FAILED' } }));
});

describe('refundEligibility', () => {
  it('allows a green (MATCHED) open case', () => {
    expect(refundEligibility(kase())).toBeNull();
  });

  it('allows a yellow case (evidence sent, not matched) only after it was approved', () => {
    const claims = [{ evidence_type: 'SCREENSHOT' }];
    expect(refundEligibility(kase({ verification: { status: 'UNMATCHED' }, claims }))).toBe('Approve the evidence in Review before refunding.');
    expect(refundEligibility(kase({ verification: { status: 'UNMATCHED' }, review: { decision: 'APPROVED' }, claims }))).toBeNull();
  });

  it("allows a case nobody sent evidence for: Razorpay's live check decides", () => {
    expect(refundEligibility(kase({ verification: { status: 'PENDING' }, claims: [] }))).toBeNull();
    expect(refundEligibility(kase({ verification: { status: 'UNMATCHED' }, claims: undefined }))).toBeNull();
  });

  it('refuses a refunded or closed case', () => {
    expect(refundEligibility(kase({ refund: { status: 'PROCESSED' } }))).toMatch(/already been refunded/);
    expect(refundEligibility(kase({ resolution: { state: 'REJECTED' } }))).toMatch(/closed/);
  });
});

describe('refundBasis', () => {
  it('is VERIFIED for matched or approved evidence', () => {
    expect(refundBasis(kase({ claims: [{}] }))).toBe('VERIFIED');
    expect(refundBasis(kase({ verification: { status: 'UNMATCHED' }, review: { decision: 'APPROVED' }, claims: [{}] }))).toBe('VERIFIED');
  });

  it('is LIVE_CHECK when no evidence was ever sent', () => {
    expect(refundBasis(kase({ verification: { status: 'PENDING' }, claims: [] }))).toBe('LIVE_CHECK');
    expect(refundBasis(kase({ verification: { status: 'NOT_CAPTURED' }, claims: [] }))).toBe('LIVE_CHECK');
  });

  it('is null while sent evidence waits for Review (unmatched, errored or still being checked)', () => {
    for (const status of ['UNMATCHED', 'ERROR', 'PENDING']) {
      expect(refundBasis(kase({ verification: { status }, claims: [{}] }))).toBeNull();
    }
  });
});

describe('liveRefundCheck', () => {
  const noEvidence = (over: Record<string, unknown> = {}) =>
    kase({ verification: { status: 'PENDING', matched_payment_id: '' }, claims: [], ...over });

  it("finds the order's one unbooked capture for a case without evidence and answers what is left", async () => {
    m(fetchRazorpayOrderPayments).mockResolvedValue([live({ id: 'pay_9', status: 'captured' }), live({ id: 'pay_f', status: 'failed' })]);
    m(fetchRazorpayPayment).mockResolvedValue(live({ id: 'pay_9', amount_refunded: 900 }));
    const out = await liveRefundCheck(noEvidence());
    expect(fetchRazorpayOrderPayments).toHaveBeenCalledWith('order_1', 'acct_1');
    expect(out).toMatchObject({ razorpayPaymentId: 'pay_9', amountPaise: 49000 });
  });

  it('refuses a payment that never had a Razorpay order, without asking Razorpay', async () => {
    await expect(liveRefundCheck(noEvidence({ razorpay_order_id: '' }))).rejects.toThrow(
      'This payment never had a Razorpay order, so there is nothing to refund through Razorpay.'
    );
    expect(fetchRazorpayOrderPayments).not.toHaveBeenCalled();
  });

  it('refuses when Razorpay shows no capture on the order', async () => {
    m(fetchRazorpayOrderPayments).mockResolvedValue([live({ status: 'failed' })]);
    await expect(liveRefundCheck(noEvidence())).rejects.toBeInstanceOf(RefundRefusal);
  });

  it('refuses when the payment document is gone', async () => {
    m(PaymentModel.findById).mockResolvedValue(null);
    await expect(liveRefundCheck(noEvidence())).rejects.toThrow('The payment behind this case was not found.');
  });
});

describe('refundGuard', () => {
  const booking = { exists: false, bookedRazorpayPaymentId: null };

  it('sends captured minus already refunded, in paise', () => {
    expect(refundGuard({ live: live({ amount_refunded: 9900 }), orderId: 'order_1', booking })).toEqual({ ok: true, amountPaise: 40000 });
  });

  it('refuses a payment of another order', () => {
    expect(refundGuard({ live: live({ order_id: 'order_X' }), orderId: 'order_1', booking })).toMatchObject({ ok: false });
  });

  it('refuses money Razorpay never captured', () => {
    const result = refundGuard({ live: live({ status: 'failed' }), orderId: 'order_1', booking });
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/only captured money/) });
  });

  it('refuses when the booking exists for this payment, or for an unknown one', () => {
    expect(refundGuard({ live: live(), orderId: 'order_1', booking: { exists: true, bookedRazorpayPaymentId: 'pay_1' } }).ok).toBe(false);
    expect(refundGuard({ live: live(), orderId: 'order_1', booking: { exists: true, bookedRazorpayPaymentId: null } }).ok).toBe(false);
  });

  it('refuses a payment already fully refunded', () => {
    expect(refundGuard({ live: live({ amount_refunded: 49900 }), orderId: 'order_1', booking })).toEqual({
      ok: false,
      reason: expect.stringMatching(/already fully refunded/),
    });
  });
});

describe('initiateFailedPaymentRefund', () => {
  it('refunds once: stamps the attempt BEFORE calling Razorpay, then completes', async () => {
    await initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor);

    expect(createRazorpayRefund).toHaveBeenCalledWith({
      paymentId: 'pay_1',
      amountPaise: 49900,
      receipt: `fpc_${CASE_ID}_1`,
      notes: { case_id: CASE_ID, payment_id: 'PAY-1' },
      account: 'acct_1',
    });
    const stamp = m(FailedPaymentCaseModel.updateOne).mock.calls.findIndex(
      ([, update]) => update.$set?.['refund.attempted_at'] instanceof Date
    );
    expect(stamp).toBeGreaterThanOrEqual(0);
    const stampOrder = m(FailedPaymentCaseModel.updateOne).mock.invocationCallOrder[stamp];
    expect(stampOrder).toBeLessThan(m(createRazorpayRefund).mock.invocationCallOrder[0]);
    expect(completeRefund).toHaveBeenCalledWith(CASE_ID, 'rfnd_1', 'SERVER');
  });

  it('files an automatic refund\'s trail under SYSTEM, through the very same claim and send', async () => {
    await claimAndSend(kase(), `auto_${CASE_ID}_1`, SYSTEM_ACTOR);

    expect(FailedPaymentCaseModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(createRazorpayRefund).toHaveBeenCalledWith(expect.objectContaining({ receipt: `fpc_${CASE_ID}_1` }));
    const sources = m(recordPaymentEvent).mock.calls.map(([event]) => [event.type, event.source]);
    expect(sources).toEqual(
      expect.arrayContaining([
        ['REFUND_REQUESTED', 'SYSTEM'],
        ['REFUND_INITIATED', 'SYSTEM'],
      ]),
    );
    expect(sources.some(([, source]) => source === 'FINANCE')).toBe(false);
  });

  it('claims with one conditional write that only an idle or stale refund can win', async () => {
    await initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor);
    const [filter, update] = m(FailedPaymentCaseModel.findOneAndUpdate).mock.calls[0];
    expect(filter['resolution.state']).toBe('OPEN');
    expect(filter.$or[0]).toEqual({ 'refund.status': { $in: ['', 'FAILED'] } });
    expect(filter.$or[1]).toMatchObject({ 'refund.status': 'PENDING', 'refund.razorpay_refund_id': '' });
    expect(update.$set['refund.status']).toBe('PENDING');
  });

  it('turns away a second, parallel request without sending anything', async () => {
    m(FailedPaymentCaseModel.findOneAndUpdate).mockResolvedValue(null);
    await expect(initiateFailedPaymentRefund(CASE_ID, 'req-other-123', actor)).rejects.toMatchObject({
      message: expect.stringMatching(/already on its way/),
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it('answers a repeat of the same click with the case as it stands', async () => {
    const pending = claimed();
    m(FailedPaymentCaseModel.findById).mockResolvedValue(pending);
    await expect(initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor)).resolves.toBe(pending);
    expect(FailedPaymentCaseModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it('refuses an ineligible case before claiming anything', async () => {
    // Evidence was sent and did not match: it waits for Review, so no refund yet.
    m(FailedPaymentCaseModel.findById).mockResolvedValue(
      kase({ verification: { status: 'UNMATCHED' }, claims: [{ evidence_type: 'SCREENSHOT' }] })
    );
    await expect(initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(FailedPaymentCaseModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ['a booking exists', () => m(bookingFor).mockResolvedValue({ exists: true, bookedRazorpayPaymentId: 'pay_1' }), /booking exists/],
    ['the payment was never captured', () => m(fetchRazorpayPayment).mockResolvedValue(live({ status: 'failed' })), /only captured/],
    ['it is already refunded', () => m(fetchRazorpayPayment).mockResolvedValue(live({ amount_refunded: 49900 })), /fully refunded/],
  ])('refuses when %s, releases the claim and sends nothing', async (_label, arrange, message) => {
    arrange();
    await expect(initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor)).rejects.toMatchObject({
      message: expect.stringMatching(message),
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(createRazorpayRefund).not.toHaveBeenCalled();
    const release = m(FailedPaymentCaseModel.updateOne).mock.calls.find(([, update]) => update.$set?.['refund.status'] === '');
    expect(release?.[0]).toMatchObject({ 'refund.status': 'PENDING', 'refund.client_request_id': 'req-12345678' });
  });

  it('after a crash, adopts the refund Razorpay already has instead of sending a second one', async () => {
    m(listRazorpayRefunds).mockResolvedValue([
      { id: 'rfnd_other', status: 'processed', amount: 100, receipt: 'someone-else' },
      { id: 'rfnd_old', status: 'pending', amount: 49900, receipt: `fpc_${CASE_ID}_1` },
    ]);
    await initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor);
    expect(createRazorpayRefund).not.toHaveBeenCalled();
    expect(FailedPaymentCaseModel.updateOne).toHaveBeenCalledWith(
      { _id: CASE_ID },
      { $set: expect.objectContaining({ 'refund.razorpay_refund_id': 'rfnd_old' }) }
    );
    // Still pending at Razorpay: left for the webhook / poller.
    expect(completeRefund).not.toHaveBeenCalled();
  });

  it('sends a fresh refund when our earlier one failed at Razorpay', async () => {
    m(listRazorpayRefunds).mockResolvedValue([{ id: 'rfnd_dead', status: 'failed', amount: 49900, receipt: `fpc_${CASE_ID}_1` }]);
    await initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor);
    expect(createRazorpayRefund).toHaveBeenCalledTimes(1);
  });

  it('keeps the reconciler off a capture whose money is going back', async () => {
    await initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor);
    expect(PaymentModel.updateOne).toHaveBeenCalledWith(
      { _id: '65aa00000000000000000002' },
      { $set: { 'metadata.failed_payment_refund_case': CASE_ID } }
    );
  });

  it('flags a gateway error FAILED (for a safe retry) instead of throwing', async () => {
    m(createRazorpayRefund).mockRejectedValue(new Error('Razorpay refund failed: insufficient balance'));
    await initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor);
    expect(failRefund).toHaveBeenCalledWith(CASE_ID, 'Razorpay refund failed: insufficient balance', 'SERVER');
  });

  it('picks the single unbooked capture of the order when the check matched no id (approved case)', async () => {
    m(FailedPaymentCaseModel.findOneAndUpdate).mockResolvedValue(
      claimed({ verification: { status: 'UNMATCHED', matched_payment_id: '' }, review: { decision: 'APPROVED' } })
    );
    m(fetchRazorpayOrderPayments).mockResolvedValue([live({ id: 'pay_A', status: 'failed' }), live({ id: 'pay_B' })]);
    m(fetchRazorpayPayment).mockResolvedValue(live({ id: 'pay_B' }));
    await initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor);
    expect(createRazorpayRefund).toHaveBeenCalledWith(expect.objectContaining({ paymentId: 'pay_B' }));
  });

  it('refuses an order with two unbooked captures rather than guessing', async () => {
    m(FailedPaymentCaseModel.findOneAndUpdate).mockResolvedValue(
      claimed({ verification: { status: 'UNMATCHED', matched_payment_id: '' }, review: { decision: 'APPROVED' } })
    );
    m(fetchRazorpayOrderPayments).mockResolvedValue([live({ id: 'pay_A' }), live({ id: 'pay_B' })]);
    await expect(initiateFailedPaymentRefund(CASE_ID, 'req-12345678', actor)).rejects.toMatchObject({
      message: expect.stringMatching(/more than one captured/),
    });
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });
});
