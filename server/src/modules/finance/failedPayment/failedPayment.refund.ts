import { GraphQLError } from 'graphql';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import {
  createRazorpayRefund,
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  listRazorpayRefunds,
  type RazorpayPaymentSummary,
} from '@modules/finance/payment/razorpay.gateway';
import { FailedPaymentCaseModel, type IFailedPaymentCase } from './failedPaymentCase.model';
import { bookingFor, type BookingInfo } from './failedPayment.booking';
import { completeRefund, failRefund } from './failedPayment.refundOutcome';
import { recordPaymentEvent } from './paymentEvent.service';
import type { ActorSnapshot } from './failedPayment.types';

/**
 * Sending a failed payment's money back through Razorpay — at most once.
 *
 * Built on the pod-shop refund (productOrder.refund.ts) and hardened for a
 * button a person presses:
 *  1. Eligibility: the case is open and either MATCHED (green) or APPROVED.
 *  2. One conditional write claims the refund ('' / FAILED → PENDING). Of two
 *     clicks or two tabs only one wins; the other is told it is under way.
 *  3. Live re-check with Razorpay: the payment belongs to this case's order, is
 *     `captured`, no booking used it, and something is left to refund.
 *  4. Razorpay's refund call has no idempotency key, so before EVERY send the
 *     payment's refunds are listed and one of ours (receipt `fpc_<case>_n`)
 *     still alive is adopted instead — a crash between sending and recording
 *     can never send twice. `attempted_at` is stamped before the call.
 *  5. Amount = captured − already refunded, integer paise.
 * A refusal at step 3 releases the claim; a gateway error leaves it FAILED for
 * a retry (which repeats step 4 first).
 */

/** A PENDING claim with no refund id older than this was abandoned by a crash. */
const IN_FLIGHT_MS = 15 * 60_000;

export const receiptPrefix = (caseId: string) => `fpc_${caseId}`;

/** A refusal the person pressing Refund must read — never a gateway fault. */
class RefundRefusal extends Error {}
function refuse(message: string): never {
  throw new RefundRefusal(message);
}

/** Whether the case may be refunded at all, before any gateway call. Pure, for tests. */
export function refundEligibility(kase: Pick<IFailedPaymentCase, 'resolution' | 'verification' | 'review' | 'refund'>): string | null {
  if (kase.refund.status === 'PROCESSED') return 'This payment has already been refunded.';
  if (kase.resolution.state !== 'OPEN') return 'This case is closed.';
  if (kase.verification.status !== 'MATCHED' && kase.review?.decision !== 'APPROVED') {
    return 'Approve the evidence in Review before refunding.';
  }
  return null;
}

export interface GuardInput {
  live: RazorpayPaymentSummary;
  orderId: string;
  booking: BookingInfo;
}

/** The live checks right before money moves. Answers the paise to send, or the refusal. Pure, for tests. */
export function refundGuard(input: GuardInput): { ok: true; amountPaise: number } | { ok: false; reason: string } {
  const { live, booking } = input;
  if (!input.orderId || live.order_id !== input.orderId) return { ok: false, reason: 'This Razorpay payment does not belong to this order.' };
  if (live.status !== 'captured') {
    return { ok: false, reason: `Razorpay shows this payment as ${live.status || 'unknown'}; only captured money can be refunded.` };
  }
  if (booking.exists && (!booking.bookedRazorpayPaymentId || booking.bookedRazorpayPaymentId === live.id)) {
    return { ok: false, reason: 'A booking exists for this payment, so it cannot be refunded here.' };
  }
  const amountPaise = Math.max(0, Math.round(live.amount) - Math.round(live.amount_refunded));
  if (amountPaise <= 0) return { ok: false, reason: 'Razorpay shows this payment as already fully refunded.' };
  return { ok: true, amountPaise };
}

const accountOf = (payment: IPayment) => (payment.metadata?.razorpay_account as string | undefined) || null;

/** The Razorpay payment to refund: the one the check matched, else the order's single unbooked capture. */
async function targetPaymentId(kase: IFailedPaymentCase, payment: IPayment, booking: BookingInfo): Promise<string> {
  if (kase.verification.matched_payment_id) return kase.verification.matched_payment_id;
  const payments = await fetchRazorpayOrderPayments(kase.razorpay_order_id, accountOf(payment));
  const captured = payments.filter((p) => p.status === 'captured' && p.id !== booking.bookedRazorpayPaymentId);
  if (captured.length === 0) refuse('Razorpay shows no captured payment on this order.');
  if (captured.length > 1) refuse('This order has more than one captured payment; refund it from the Razorpay dashboard.');
  return captured[0].id;
}

async function sendOnce(kase: IFailedPaymentCase, payment: IPayment, razorpayPaymentId: string, amountPaise: number) {
  const account = accountOf(payment);
  const prefix = receiptPrefix(String(kase._id));
  const existing = (await listRazorpayRefunds(razorpayPaymentId, account)).find(
    (r) => r.receipt.startsWith(prefix) && r.status !== 'failed'
  );
  if (existing) return existing;
  await FailedPaymentCaseModel.updateOne(
    { _id: kase._id },
    { $set: { 'refund.attempted_at': new Date(), 'refund.amount_paise': amountPaise, 'refund.razorpay_payment_id': razorpayPaymentId } }
  );
  // The reconciler must never book a capture whose money is on its way back.
  await PaymentModel.updateOne({ _id: payment._id }, { $set: { 'metadata.failed_payment_refund_case': String(kase._id) } });
  return createRazorpayRefund({
    paymentId: razorpayPaymentId,
    amountPaise,
    receipt: `${prefix}_${kase.refund.attempts}`,
    notes: { case_id: String(kase._id), payment_id: kase.payment_id },
    account,
  });
}

/** Release a claim a live check refused, so the case can be acted on again once the facts change. */
async function releaseClaim(kase: IFailedPaymentCase, reason: string, actor: ActorSnapshot) {
  await FailedPaymentCaseModel.updateOne(
    { _id: kase._id, 'refund.status': 'PENDING', 'refund.client_request_id': kase.refund.client_request_id, 'refund.razorpay_refund_id': '' },
    { $set: { 'refund.status': '', 'refund.error': reason }, $inc: { revision: 1 } }
  );
  await recordPaymentEvent({
    paymentDocId: kase.payment_doc_id,
    caseId: kase._id,
    type: 'REFUND_FAILED',
    source: 'FINANCE',
    actor,
    data: { refused: true, reason },
  });
}

type SentRefund = Awaited<ReturnType<typeof createRazorpayRefund>>;

/** Record what Razorpay answered and follow it to its end state. */
async function afterSend(kase: IFailedPaymentCase, refund: SentRefund, razorpayPaymentId: string, fallbackPaise: number, actor: ActorSnapshot) {
  const amountPaise = refund.amount || fallbackPaise;
  await FailedPaymentCaseModel.updateOne(
    { _id: kase._id },
    { $set: { 'refund.razorpay_refund_id': refund.id, 'refund.razorpay_payment_id': razorpayPaymentId, 'refund.amount_paise': amountPaise } }
  );
  await recordPaymentEvent({
    paymentDocId: kase.payment_doc_id,
    caseId: kase._id,
    type: 'REFUND_INITIATED',
    source: 'FINANCE',
    actor,
    data: { razorpay_refund_id: refund.id, razorpay_payment_id: razorpayPaymentId, amount_paise: amountPaise, status: refund.status },
  });
  if (refund.status === 'processed') return completeRefund(String(kase._id), refund.id, 'SERVER');
  if (refund.status === 'failed') return failRefund(String(kase._id), 'Razorpay marked the refund failed.', 'SERVER');
  // pending: the webhook or the poller finishes it.
  return FailedPaymentCaseModel.findById(kase._id);
}

/** Steps 3–5 for a claimed case. */
async function checkAndSend(kase: IFailedPaymentCase, actor: ActorSnapshot) {
  const payment = await PaymentModel.findById(kase.payment_doc_id);
  if (!payment) refuse('The payment behind this case was not found.');
  const booking = await bookingFor(payment);
  const razorpayPaymentId = await targetPaymentId(kase, payment, booking);
  const live = await fetchRazorpayPayment(razorpayPaymentId, accountOf(payment));
  const guard = refundGuard({ live, orderId: kase.razorpay_order_id, booking });
  if (!guard.ok) refuse(guard.reason);
  const refund = await sendOnce(kase, payment, razorpayPaymentId, guard.amountPaise);
  return afterSend(kase, refund, razorpayPaymentId, guard.amountPaise, actor);
}

async function send(kase: IFailedPaymentCase, actor: ActorSnapshot): Promise<IFailedPaymentCase | null> {
  try {
    return await checkAndSend(kase, actor);
  } catch (error) {
    if (error instanceof RefundRefusal) {
      await releaseClaim(kase, error.message, actor);
      throw new GraphQLError(error.message, { extensions: { code: 'BAD_USER_INPUT' } });
    }
    return failRefund(String(kase._id), (error as Error).message || 'Razorpay refund failed', 'SERVER');
  }
}

/** Finance pressed Refund. Safe to press twice, from two tabs, or after a crash. */
export async function initiateFailedPaymentRefund(
  caseId: string,
  clientRequestId: string,
  actor: ActorSnapshot
): Promise<IFailedPaymentCase | null> {
  const current = await FailedPaymentCaseModel.findById(caseId);
  if (!current) throw new GraphQLError('Failed payment not found', { extensions: { code: 'NOT_FOUND' } });
  // The same click arriving twice gets the answer of the first.
  if (current.refund.status === 'PROCESSED') return current;
  if (current.refund.status === 'PENDING' && current.refund.client_request_id === clientRequestId) return current;
  const ineligible = refundEligibility(current);
  if (ineligible) throw new GraphQLError(ineligible, { extensions: { code: 'BAD_USER_INPUT' } });

  const now = new Date();
  const claimed = await FailedPaymentCaseModel.findOneAndUpdate(
    {
      _id: caseId,
      'resolution.state': 'OPEN',
      $or: [
        { 'refund.status': { $in: ['', 'FAILED'] } },
        { 'refund.status': 'PENDING', 'refund.razorpay_refund_id': '', 'refund.claimed_at': { $lt: new Date(now.getTime() - IN_FLIGHT_MS) } },
      ],
    },
    {
      $set: {
        'refund.status': 'PENDING',
        'refund.client_request_id': clientRequestId,
        'refund.claimed_at': now,
        'refund.initiated_by': actor.id,
        'refund.initiated_by_name': actor.name,
        'refund.error': '',
      },
      $inc: { 'refund.attempts': 1, revision: 1 },
    },
    { new: true }
  );
  if (!claimed) {
    throw new GraphQLError('This refund is already on its way to Razorpay. Reload in a few minutes.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  await recordPaymentEvent({
    paymentDocId: claimed.payment_doc_id,
    caseId: claimed._id,
    type: 'REFUND_REQUESTED',
    source: 'FINANCE',
    actor,
    data: { attempt: claimed.refund.attempts },
  });
  return send(claimed, actor);
}
