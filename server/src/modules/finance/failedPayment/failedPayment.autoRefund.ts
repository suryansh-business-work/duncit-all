import { logs } from '@observability/log';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import { FailedPaymentCaseModel, type IFailedPaymentCase } from './failedPaymentCase.model';
import { claimAndSend } from './failedPayment.refund';
import { SYSTEM_ACTOR } from './failedPayment.types';

/**
 * Giving money back without waiting for a person, when the money bought nothing.
 *
 * Only one situation qualifies: the finalizer marked the payment FAILED with
 * `needs_refund` — Razorpay captured the charge (proven by the signature check or
 * by asking Razorpay itself) and no booking, order or gift card was written. The
 * buyer has nothing to show for the charge, so there is nothing to review.
 *
 * Every refund still goes through `claimAndSend`, the same path as Finance's
 * button: one conditional claim, a live re-check with Razorpay (captured, this
 * order, no booking, something left), and a receipt-keyed lookup before the send,
 * so an automatic retry can never send the money twice. A case whose claims keep
 * failing stops after AUTO_REFUND_MAX_ATTEMPTS and stays on Finance's queue.
 */

export const AUTO_REFUND_MAX_ATTEMPTS = 3;
/** A failed automatic attempt is retried no sooner than this — a gateway blip, not a loop. */
const RETRY_AFTER_MS = 10 * 60_000;
const SWEEP_BATCH = 20;

type CaseFacts = Pick<IFailedPaymentCase, 'sources' | 'resolution' | 'refund'>;
type PaymentFacts = Pick<IPayment, 'finalize_state' | 'needs_refund' | 'status' | 'gateway'>;

/** Whether the server may refund this case on its own. Pure, for tests. */
export function isAutoRefundable(kase: CaseFacts, payment: PaymentFacts | null): boolean {
  if (!payment) return false;
  return (
    kase.sources.includes('FINALIZE_FAILED') &&
    kase.resolution.state === 'OPEN' &&
    (kase.refund.status === '' || kase.refund.status === 'FAILED') &&
    kase.refund.attempts < AUTO_REFUND_MAX_ATTEMPTS &&
    payment.gateway === 'RAZORPAY' &&
    payment.finalize_state === 'FAILED' &&
    payment.needs_refund === true &&
    payment.status !== 'REFUNDED'
  );
}

/**
 * Refund one case if it qualifies. Never throws: it runs inside the payment flow
 * and on a sweep, and a refusal (Razorpay shows the charge as only authorized, a
 * booking turned up after all) is already written to the case's trail.
 */
export async function autoRefundCase(caseId: string): Promise<void> {
  try {
    const kase = await FailedPaymentCaseModel.findById(caseId);
    if (!kase) return;
    const payment = await PaymentModel.findById(kase.payment_doc_id)
      .select('finalize_state needs_refund status gateway')
      .lean();
    if (!isAutoRefundable(kase, payment)) return;
    // One request id per attempt: the claim is what makes it at-most-once, the id
    // only tells a repeat of the SAME attempt apart from a new one.
    await claimAndSend(kase, `auto_${caseId}_${kase.refund.attempts + 1}`, SYSTEM_ACTOR);
  } catch (error) {
    logs.server.warn('failedPayment', 'autoRefundCase', { error, case_id: caseId });
  }
}

/**
 * The reconciler's pass: every captured-but-unbooked case that has not been
 * refunded yet — never tried (it predates this, or the first try crashed) or a
 * failed try old enough to retry. Bounded, oldest first.
 */
export async function sweepAutoRefunds(now = Date.now()): Promise<number> {
  const due = await FailedPaymentCaseModel.find({
    sources: 'FINALIZE_FAILED',
    'resolution.state': 'OPEN',
    'refund.attempts': { $lt: AUTO_REFUND_MAX_ATTEMPTS },
    $or: [
      { 'refund.status': '' },
      { 'refund.status': 'FAILED', updated_at: { $lt: new Date(now - RETRY_AFTER_MS) } },
    ],
  })
    .select('_id')
    .sort({ created_at: 1 })
    .limit(SWEEP_BATCH)
    .lean();
  for (const kase of due) {
    await autoRefundCase(String(kase._id));
  }
  return due.length;
}
