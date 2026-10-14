/**
 * Pod-shop refunds: the share worked out from what the buyer actually paid,
 * the idempotency of a re-run, and a gateway refusal that must never be
 * thrown past a cancellation. Gateway and ledger are mocked.
 */
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } } }));
jest.mock('@modules/finance/payment/payment.model', () => ({
  PaymentModel: { findById: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('@modules/finance/payment/payment.refundRecord', () => ({
  creditCoinsBack: jest.fn(),
  recordPaymentRefund: jest.fn(),
}));
jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  createRazorpayRefund: jest.fn(),
  listRazorpayRefunds: jest.fn(),
}));

import { PaymentModel } from '@modules/finance/payment/payment.model';
import { creditCoinsBack, recordPaymentRefund } from '@modules/finance/payment/payment.refundRecord';
import { createRazorpayRefund, listRazorpayRefunds } from '@modules/finance/payment/razorpay.gateway';
import { issueRefund, refundShare, retryRefund, type Refundable } from '../../productOrder.refund';

const m = (fn: unknown) => fn as jest.Mock;

const payment = (over: Record<string, unknown> = {}) =>
  ({
    _id: 'pay1',
    total: 900,
    coupon_discount: 100,
    coins_redeemed: 100,
    gateway: 'RAZORPAY',
    metadata: { razorpay_payment_id: 'pay_rzp1', razorpay_account: 'acct_1' },
    ...over,
  }) as never;

const target = (refund: Record<string, unknown> = {}): Refundable & { refund: any; _id: string } => ({
  _id: 'ord1',
  refund: { status: '', amount: 0, coins: 0, ...refund } as never,
  save: jest.fn().mockResolvedValue(undefined),
});

/** The refund's collection; `modifiedCount` says whether the conditional claim matched. */
const store = (modifiedCount = 1) => ({ updateOne: jest.fn().mockResolvedValue({ modifiedCount }) });

const req = (over: Record<string, unknown> = {}) => ({
  paymentId: 'pay1',
  gross: 1100,
  receipt: 'ORD-1',
  reason: 'Order ORD-1 cancelled: changed mind',
  initiatedBy: 'POD_SHOP_ADMIN_CANCEL',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  m(PaymentModel.findById).mockResolvedValue(payment());
  m(createRazorpayRefund).mockResolvedValue({ id: 'rfnd_1' });
  m(listRazorpayRefunds).mockResolvedValue([]);
});

describe('refundShare', () => {
  it('returns every rupee charged and every coin spent for the whole basket', () => {
    // 900 paid + 100 coupon + 100 coins = 1100 of goods
    expect(refundShare(payment(), 1100)).toEqual({ amount: 900, coins: 100 });
  });

  it('returns the same fraction of cash and coins for part of the goods, never the coupon', () => {
    expect(refundShare(payment(), 550)).toEqual({ amount: 450, coins: 50 });
  });

  it('never refunds more than was charged less what already went back', () => {
    const p = payment({ metadata: { refunded_amount: 800 } });
    expect(refundShare(p, 1100).amount).toBe(100);
    const spent = payment({ metadata: { refunded_amount: 5000 } });
    expect(refundShare(spent, 1100).amount).toBe(0);
  });

  it('caps the ratio at 1 and treats a negative or zero basis as nothing to refund', () => {
    expect(refundShare(payment(), 99999)).toEqual({ amount: 900, coins: 100 });
    expect(refundShare(payment(), -50)).toEqual({ amount: 0, coins: 0 });
    expect(refundShare(payment({ total: 0, coupon_discount: 0, coins_redeemed: 0 }), 500)).toEqual({
      amount: 0,
      coins: 0,
    });
  });

  it('ignores fractional or negative coins and reads missing fields as zero', () => {
    expect(refundShare(payment({ coins_redeemed: -5 }), 1000).coins).toBe(0);
    expect(refundShare(payment({ coins_redeemed: 10.9, total: 90, coupon_discount: 0 }), 100).coins).toBe(10);
    expect(refundShare({ metadata: undefined } as never, 10)).toEqual({ amount: 0, coins: 0 });
  });
});

describe('issueRefund', () => {
  it('leaves a refund that is already PROCESSED or RECORDED alone', async () => {
    for (const status of ['PROCESSED', 'RECORDED']) {
      const t = target({ status, amount: 5 });
      await issueRefund(t, req());
      expect(t.save).not.toHaveBeenCalled();
    }
    expect(PaymentModel.findById).not.toHaveBeenCalled();
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it('marks the refund FAILED when the payment cannot be found, without calling the gateway', async () => {
    m(PaymentModel.findById).mockResolvedValue(null);
    const t = target();
    const out = await issueRefund(t, req());
    expect(out.status).toBe('FAILED');
    expect(out.error).toMatch(/not found/i);
    expect(t.save).toHaveBeenCalledTimes(1);
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it('sends the share to Razorpay in paise, credits coins once and stamps Finance', async () => {
    const t = target();
    const out = await issueRefund(t, req());
    expect(out).toMatchObject({ status: 'PROCESSED', amount: 900, coins: 100, razorpay_refund_id: 'rfnd_1' });
    expect(out.refunded_at).toBeInstanceOf(Date);
    expect(out.initiated_by).toBe('POD_SHOP_ADMIN_CANCEL');
    expect(m(createRazorpayRefund).mock.calls[0][0]).toMatchObject({
      paymentId: 'pay_rzp1',
      amountPaise: 90000,
      receipt: 'ORD-1',
      account: 'acct_1',
    });
    expect(creditCoinsBack).toHaveBeenCalledWith(expect.anything(), 100, 'pod-shop-refund:ORD-1', req().reason);
    expect(recordPaymentRefund).toHaveBeenCalledWith(expect.anything(), 900, req().reason, 'POD_SHOP_ADMIN_CANCEL');
    expect(out.finance_recorded).toBe(true);
    // attempted_at is stored before the call so a crash is recognisable
    expect(t.save).toHaveBeenCalledTimes(2);
  });

  it('records a coin-only refund (nothing charged to the gateway) without calling Razorpay', async () => {
    m(PaymentModel.findById).mockResolvedValue(payment({ total: 0, coupon_discount: 0, coins_redeemed: 50 }));
    const out = await issueRefund(target(), req({ gross: 50 }));
    expect(out).toMatchObject({ status: 'RECORDED', amount: 0, coins: 50 });
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it('records a non-Razorpay payment without calling the gateway', async () => {
    m(PaymentModel.findById).mockResolvedValue(payment({ gateway: 'MANUAL' }));
    const out = await issueRefund(target(), req());
    expect(out.status).toBe('RECORDED');
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it('keeps the cancellation alive when Razorpay refuses: FAILED, flagged for a manual payout, not thrown', async () => {
    m(createRazorpayRefund).mockRejectedValue(new Error('Insufficient balance'));
    const t = target();
    const out = await issueRefund(t, req());
    expect(out).toMatchObject({ status: 'FAILED', error: 'Insufficient balance' });
    expect(out.refunded_at).toBeUndefined();
    expect(m(recordPaymentRefund).mock.calls[0][3]).toBe('POD_SHOP_ADMIN_CANCEL:MANUAL_PAYOUT');
  });

  it('looks up a refund that may already exist before sending a second one', async () => {
    m(listRazorpayRefunds).mockResolvedValue([{ id: 'rfnd_old', receipt: 'ORD-1' }]);
    const t = target({ status: 'PENDING', amount: 900, coins: 100, attempted_at: new Date() });
    const out = await issueRefund(t, req());
    expect(listRazorpayRefunds).toHaveBeenCalledWith('pay_rzp1', 'acct_1');
    expect(createRazorpayRefund).not.toHaveBeenCalled();
    expect(out).toMatchObject({ status: 'PROCESSED', razorpay_refund_id: 'rfnd_old' });
  });

  it('sends a fresh refund when the earlier attempt left nothing at Razorpay', async () => {
    m(listRazorpayRefunds).mockResolvedValue([{ id: 'other', receipt: 'ORD-9' }]);
    const t = target({ status: 'PENDING', amount: 900, coins: 100, attempted_at: new Date() });
    await issueRefund(t, req());
    expect(createRazorpayRefund).toHaveBeenCalledTimes(1);
  });

  it('does not stamp Finance twice, and clears the manual-payout flag once a retry succeeds', async () => {
    const t = target({ status: 'PENDING', amount: 900, coins: 0, finance_recorded: true });
    const out = await issueRefund(t, req());
    expect(out.status).toBe('PROCESSED');
    expect(recordPaymentRefund).not.toHaveBeenCalled();
    expect(m(PaymentModel.updateOne).mock.calls[0]).toEqual([
      { _id: 'pay1', 'metadata.refund_initiated_by': 'POD_SHOP_ADMIN_CANCEL:MANUAL_PAYOUT' },
      { $set: { 'metadata.refund_initiated_by': 'POD_SHOP_ADMIN_CANCEL' } },
    ]);
  });

  it('leaves the manual-payout flag when the retried refund fails again', async () => {
    m(createRazorpayRefund).mockRejectedValue(new Error('still no'));
    const t = target({ status: 'FAILED', amount: 900, coins: 0, finance_recorded: true });
    await retryRefund(t, req(), store());
    expect(t.refund.status).toBe('FAILED');
    expect(PaymentModel.updateOne).not.toHaveBeenCalled();
  });
});

describe('retryRefund', () => {
  it('leaves a refund that is not FAILED or PENDING alone without claiming it', async () => {
    const processed = target({ status: 'PROCESSED' });
    const s = store();
    expect(await retryRefund(processed, req(), s)).toBe(processed.refund);
    expect(s.updateOne).not.toHaveBeenCalled();
    expect(PaymentModel.findById).not.toHaveBeenCalled();
  });

  it('claims a FAILED refund, or a PENDING one past the in-flight window, in one conditional write', async () => {
    const failed = target({ status: 'FAILED', amount: 900, coins: 100, finance_recorded: true });
    const s = store();
    const before = Date.now();
    const out = await retryRefund(failed, req(), s);

    const [filter, update] = s.updateOne.mock.calls[0];
    expect(filter._id).toBe('ord1');
    expect(filter.$or[0]).toEqual({ 'refund.status': 'FAILED' });
    expect(filter.$or[1]['refund.status']).toBe('PENDING');
    expect(before - filter.$or[1]['refund.attempted_at'].$lt.getTime()).toBeGreaterThanOrEqual(15 * 60_000);
    expect(update.$set['refund.status']).toBe('PENDING');
    expect(update.$set['refund.attempted_at'].getTime()).toBeGreaterThanOrEqual(before);
    // The fresh stamp makes the send look the refund up by receipt before creating one.
    expect(listRazorpayRefunds).toHaveBeenCalledWith('pay_rzp1', 'acct_1');
    expect(createRazorpayRefund).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ status: 'PROCESSED', razorpay_refund_id: 'rfnd_1' });
  });

  it('refuses without touching the gateway when the claim matches nothing (in flight or already claimed)', async () => {
    for (const status of ['PENDING', 'FAILED']) {
      const t = target({ status, amount: 900, coins: 0, attempted_at: new Date() });
      await expect(retryRefund(t, req(), store(0))).rejects.toThrow(/may still be on its way/);
      expect(t.refund.status).toBe(status);
    }
    expect(PaymentModel.findById).not.toHaveBeenCalled();
    expect(creditCoinsBack).not.toHaveBeenCalled();
    expect(listRazorpayRefunds).not.toHaveBeenCalled();
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });
});
