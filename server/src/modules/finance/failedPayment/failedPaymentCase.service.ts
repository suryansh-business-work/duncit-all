import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { FailedPaymentCaseModel, type ICaseError, type IFailedPaymentCase } from './failedPaymentCase.model';
import { attachEventsToCase, recordPaymentEvent } from './paymentEvent.service';
import { resolveCaseTicket, ticketText } from './failedPayment.ticket';
import type { CaseSource } from './failedPayment.types';

/**
 * Creating and touching failed-payment cases.
 *
 * A case belongs to a POD booking paid through Razorpay. Product (Pod Shop / pet
 * store) and gift-card checkouts have their own refund flows and must not be
 * mixed into this one, so for them only the event trail is written.
 */

export interface CaseTouch {
  source: CaseSource;
  error?: Partial<ICaseError> | null;
  razorpayPaymentId?: string | null;
  retryShown?: boolean;
  /** Count one more failed attempt (a client report or a webhook payment.failed). */
  countAttempt?: boolean;
}

/** Whether this payment is one the failed-payment workflow owns. */
export const isCaseEligible = (payment: Pick<IPayment, 'gateway' | 'target_type'>): boolean =>
  payment.gateway === 'RAZORPAY' && payment.target_type === 'POD';

async function podTitleOf(podId: unknown): Promise<string> {
  if (!podId) return '';
  const pod = await PodModel.findById(podId).select('pod_title').lean();
  return pod?.pod_title ?? '';
}

const cleanError = (error: Partial<ICaseError>, at: Date): ICaseError => ({
  code: String(error.code ?? '').slice(0, 120),
  description: String(error.description ?? '').slice(0, 500),
  reason: String(error.reason ?? '').slice(0, 200),
  source: String(error.source ?? '').slice(0, 120),
  step: String(error.step ?? '').slice(0, 120),
  reported_by: String(error.reported_by ?? ''),
  at,
});

/**
 * Create the payment's case if it has none, then apply `touch` — one atomic
 * upsert, so a webhook and a client report arriving together still make one
 * case. Returns null for a payment the workflow does not own.
 */
export async function upsertCaseForPayment(payment: IPayment, touch: CaseTouch): Promise<IFailedPaymentCase | null> {
  if (!isCaseEligible(payment)) return null;
  const now = new Date();
  const set: Record<string, unknown> = {};
  if (touch.error) set.latest_error = cleanError(touch.error, now);
  if (touch.razorpayPaymentId) set.razorpay_payment_id = touch.razorpayPaymentId.slice(0, 60);
  if (touch.retryShown !== undefined) set.retry_shown = touch.retryShown;
  const inc: Record<string, number> = { revision: 1 };
  if (touch.countAttempt) inc.attempts = 1;

  const existing = await FailedPaymentCaseModel.exists({ payment_doc_id: payment._id });
  const insert = existing
    ? {}
    : {
        payment_id: payment.payment_id,
        user_id: payment.user_id ?? null,
        user_name: payment.user_name ?? '',
        user_email: payment.user_email ?? '',
        user_phone: payment.user_phone ?? '',
        pod_id: payment.pod_id ?? null,
        pod_title: await podTitleOf(payment.pod_id),
        amount: payment.total ?? 0,
        currency_symbol: payment.currency_symbol || '₹',
        razorpay_order_id: String(payment.metadata?.razorpay_order_id ?? ''),
      };
  const kase = await FailedPaymentCaseModel.findOneAndUpdate(
    { payment_doc_id: payment._id },
    { $setOnInsert: insert, $set: set, $inc: inc, $addToSet: { sources: touch.source } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).catch(async (error: unknown) => {
    // Two first touches raced the unique index; the loser simply re-applies.
    if ((error as { code?: number }).code !== 11000) throw error;
    return FailedPaymentCaseModel.findOneAndUpdate(
      { payment_doc_id: payment._id },
      { $set: set, $inc: inc, $addToSet: { sources: touch.source } },
      { new: true }
    );
  });
  if (kase && !existing) await attachEventsToCase(payment._id, kase._id);
  return kase;
}

/** The case of a payment, if any. */
export function caseForPayment(paymentDocId: unknown) {
  return FailedPaymentCaseModel.findOne({ payment_doc_id: paymentDocId });
}

/**
 * The finalizer could not write the booking for captured money (or a sweep
 * found such a payment): open its case so Finance sees it with the rest.
 * Best-effort — called from the payment flow, which must never fail over it.
 */
export async function openCaseForFinalizeFailure(paymentDocId: string, message: string): Promise<void> {
  try {
    const payment = await PaymentModel.findById(paymentDocId);
    if (!payment || payment.needs_refund !== true) return;
    const kase = await upsertCaseForPayment(payment, {
      source: 'FINALIZE_FAILED',
      error: { code: 'FINALIZE_FAILED', description: message, source: 'server', step: 'finalize', reported_by: 'SERVER' },
      razorpayPaymentId: String(payment.metadata?.razorpay_payment_id ?? ''),
    });
    await recordPaymentEvent({
      paymentDocId,
      caseId: kase?._id,
      type: 'FINALIZE_FAILED',
      source: 'SERVER',
      data: { message, razorpay_payment_id: String(payment.metadata?.razorpay_payment_id ?? '') },
      dedupeKey: `finalize-failed:${paymentDocId}`,
    });
  } catch (error) {
    logs.server.warn('failedPayment', 'openCaseForFinalizeFailure', { error, paymentDocId });
  }
}

/** How many needs-refund payments one sweep turns into cases — a bounded batch. */
const NEEDS_REFUND_BATCH = 50;

/**
 * The reconciler's needs-human sweep: every captured-but-unbooked payment that
 * has no case yet gets one, so nothing waits on Finance unseen.
 */
export async function openCasesForNeedsRefund(): Promise<number> {
  const withCase = await FailedPaymentCaseModel.distinct('payment_doc_id', { sources: 'FINALIZE_FAILED' });
  const payments = await PaymentModel.find({
    needs_refund: true,
    gateway: 'RAZORPAY',
    target_type: 'POD',
    _id: { $nin: withCase.map((id) => new Types.ObjectId(String(id))) },
  })
    .select('_id finalize_error')
    .limit(NEEDS_REFUND_BATCH)
    .lean();
  for (const payment of payments) {
    await openCaseForFinalizeFailure(String(payment._id), payment.finalize_error ?? 'Checkout finalization failed');
  }
  return payments.length;
}

/**
 * The reconciler adopted a capture and the booking exists: an open case for this
 * payment is answered — the buyer has their seat, nothing is owed.
 */
export async function markCaseBooked(paymentDocId: string): Promise<void> {
  try {
    const kase = await FailedPaymentCaseModel.findOneAndUpdate(
      { payment_doc_id: paymentDocId, 'resolution.state': 'OPEN', 'refund.status': '' },
      { $set: { 'resolution.state': 'BOOKED', 'resolution.at': new Date(), 'resolution.by_name': 'SYSTEM' }, $inc: { revision: 1 } },
      { new: true }
    );
    if (!kase) return;
    await recordPaymentEvent({
      paymentDocId,
      caseId: kase._id,
      type: 'BOOKING_CONFIRMED',
      source: 'SYSTEM',
      dedupeKey: `booked:${paymentDocId}`,
    });
    // Filed under the buyer: no staff member made this happen.
    if (kase.user_id) await resolveCaseTicket(kase, String(kase.user_id), ticketText.booked(kase), null);
  } catch (error) {
    logs.server.warn('failedPayment', 'markCaseBooked', { error, paymentDocId });
  }
}
