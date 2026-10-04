import { logs } from '@observability/log';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import { creditCoinsBack, recordPaymentRefund } from '@modules/finance/payment/payment.refundRecord';
import { createRazorpayRefund, listRazorpayRefunds } from '@modules/finance/payment/razorpay.gateway';
import type { IOrderRefund } from './productOrder.model';

/**
 * Money going back to a pod-shop buyer — for a cancelled order or a returned
 * part of one. One routine for both, so the share, the Razorpay call and the
 * ledger stamp are worked out the same way everywhere.
 *
 * The share: a pod-shop payment can carry a pod seat, several product orders,
 * a coupon and coins. Coupons and coins cut the gross (GST is inclusive), so
 * the buyer's money behind `gross` worth of goods is the same fraction of what
 * was actually charged — and of the coins they spent, which go back as coins.
 * The coupon part is a discount nobody paid, so it does not come back.
 *
 * Safe to call again: a refund already PROCESSED/RECORDED is left alone; one
 * sent to Razorpay with no answer recorded is looked up by its receipt before
 * anything is sent a second time.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Anything carrying a refund record: a product order or a pod-shop return. */
export interface Refundable {
  refund: IOrderRefund;
  save(): Promise<unknown>;
}

export interface RefundRequest {
  paymentId: unknown;
  /** Goods value being reversed, at the prices the order recorded (incl. GST). */
  gross: number;
  /** Unique per refund (order or return number) — Razorpay's receipt and our coin dedupe key. */
  receipt: string;
  reason: string;
  initiatedBy: string;
}

/** What the buyer gets back for `gross` worth of goods on this payment. */
export function refundShare(payment: IPayment, gross: number) {
  const coinsSpent = Math.max(0, Math.floor(payment.coins_redeemed ?? 0));
  const before = (payment.total ?? 0) + (payment.coupon_discount ?? 0) + coinsSpent;
  const ratio = before > 0 ? Math.min(1, Math.max(0, gross) / before) : 0;
  const alreadyBack = Number(payment.metadata?.refunded_amount) || 0;
  const cashLeft = Math.max(0, round2((payment.total ?? 0) - alreadyBack));
  return {
    amount: Math.min(cashLeft, round2((payment.total ?? 0) * ratio)),
    coins: Math.floor(coinsSpent * ratio),
  };
}

const MANUAL_SUFFIX = ':MANUAL_PAYOUT';

/** The captured Razorpay payment behind a payment row, or '' when it never went through Razorpay. */
function razorpayPaymentOf(payment: IPayment): string {
  if (payment.gateway !== 'RAZORPAY') return '';
  return String(payment.metadata?.razorpay_payment_id ?? '');
}

/** Send (or find) the Razorpay refund; answers the refund id. Throws Razorpay's refusal. */
async function sendToRazorpay(target: Refundable, payment: IPayment, req: RefundRequest, rzpPaymentId: string) {
  const account = (payment.metadata?.razorpay_account as string | undefined) || null;
  if (target.refund.attempted_at) {
    // We sent one before and never recorded the answer — it may well exist.
    const existing = (await listRazorpayRefunds(rzpPaymentId, account)).find((r) => r.receipt === req.receipt);
    if (existing) return existing.id;
  }
  target.refund.attempted_at = new Date();
  await target.save();
  const refund = await createRazorpayRefund({
    paymentId: rzpPaymentId,
    amountPaise: Math.round(target.refund.amount * 100),
    receipt: req.receipt,
    notes: { receipt: req.receipt, reason: req.reason.slice(0, 250) },
    account,
  });
  return refund.id;
}

/** Stamp Finance › User Refund Logs exactly once; a refusal is flagged for a manual payout. */
async function recordInFinance(target: Refundable, payment: IPayment, req: RefundRequest) {
  if (target.refund.finance_recorded) {
    // A retry that went through clears the manual-payout flag Finance was shown.
    if (target.refund.status === 'PROCESSED') {
      await PaymentModel.updateOne(
        { _id: payment._id, 'metadata.refund_initiated_by': `${req.initiatedBy}${MANUAL_SUFFIX}` },
        { $set: { 'metadata.refund_initiated_by': req.initiatedBy } }
      );
    }
    return;
  }
  const by = target.refund.status === 'FAILED' ? `${req.initiatedBy}${MANUAL_SUFFIX}` : req.initiatedBy;
  await recordPaymentRefund(payment, target.refund.amount, req.reason, by);
  target.refund.finance_recorded = true;
}

/**
 * Refund `req.gross` worth of goods. Never throws for a gateway refusal: the
 * refund is left FAILED with Razorpay's reason (and flagged to Finance), so a
 * cancellation is never half-done because the gateway said no.
 */
export async function issueRefund(target: Refundable, req: RefundRequest): Promise<IOrderRefund> {
  const done = target.refund.status === 'PROCESSED' || target.refund.status === 'RECORDED';
  if (done) return target.refund;
  const payment = await PaymentModel.findById(req.paymentId);
  if (!payment) {
    target.refund.status = 'FAILED';
    target.refund.error = 'The payment behind this order was not found';
    await target.save();
    return target.refund;
  }
  if (!target.refund.status) {
    const share = refundShare(payment, req.gross);
    target.refund.amount = share.amount;
    target.refund.coins = share.coins;
    target.refund.initiated_by = req.initiatedBy;
    target.refund.status = 'PENDING';
  }
  await creditCoinsBack(payment, target.refund.coins, `pod-shop-refund:${req.receipt}`, req.reason);

  const rzpPaymentId = razorpayPaymentOf(payment);
  if (target.refund.amount <= 0 || !rzpPaymentId) {
    target.refund.status = 'RECORDED';
  } else {
    try {
      target.refund.razorpay_refund_id = await sendToRazorpay(target, payment, req, rzpPaymentId);
      target.refund.status = 'PROCESSED';
      target.refund.error = '';
    } catch (error) {
      target.refund.status = 'FAILED';
      target.refund.error = (error as Error).message;
      logs.server.error('productOrder', 'issueRefund', { error, receipt: req.receipt, amount: target.refund.amount });
    }
  }
  if (target.refund.status !== 'FAILED') target.refund.refunded_at = new Date();
  await recordInFinance(target, payment, req);
  await target.save();
  logs.server.info('productOrder', 'refund', {
    receipt: req.receipt,
    status: target.refund.status,
    amount: target.refund.amount,
    coins: target.refund.coins,
    razorpay_refund_id: target.refund.razorpay_refund_id,
    initiated_by: req.initiatedBy,
  });
  return target.refund;
}

/** An operator's retry of a refund Razorpay refused, or one left PENDING by a crash mid-call. */
export async function retryRefund(target: Refundable, req: RefundRequest): Promise<IOrderRefund> {
  if (target.refund.status !== 'FAILED' && target.refund.status !== 'PENDING') return target.refund;
  target.refund.status = 'PENDING';
  return issueRefund(target, req);
}
