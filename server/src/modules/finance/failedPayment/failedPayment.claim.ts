import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { IPayment } from '@modules/finance/payment/payment.model';
import { ticketService } from '@modules/support/ticket/ticket.service';
import { FailedPaymentCaseModel, type IFailedPaymentCase } from './failedPaymentCase.model';
import { upsertCaseForPayment } from './failedPaymentCase.service';
import { ownPayment } from './failedPayment.report';
import { evidenceFilesFor } from './failedPayment.evidence';
import { verifyInBackground } from './failedPayment.verify';
import { recordPaymentEvent } from './paymentEvent.service';
import { forPod } from './failedPayment.ticket';
import type { SubmitClaimInput } from './failedPayment.validator';

/**
 * "My payment was deducted but the booking was not completed."
 *
 * One PAYMENT support ticket per payment: a claim reuses the case's ticket — or
 * the buyer's own open ticket already linked to this payment (the apps open one
 * automatically when a checkout times out) — and only opens a new one when
 * neither is open. Every claim's evidence is appended to the case and the
 * AI + Razorpay check is started in the background.
 */

/** A ticket being opened for a case is held this long before another claim may try. */
const TICKET_LOCK_MS = 60_000;

/** Claims one payment may carry — enough for any honest follow-up, a ceiling on replay. */
const MAX_CLAIMS_PER_CASE = 20;

const ticketSubject = 'Payment deducted but booking not completed';

const ticketBody = (kase: IFailedPaymentCase, input: SubmitClaimInput) =>
  [
    `Payment ${kase.payment_id} of ${kase.currency_symbol}${kase.amount.toFixed(2)}${forPod(kase)}.`,
    kase.razorpay_payment_id ? `Razorpay payment: ${kase.razorpay_payment_id}.` : '',
    input.evidence_type === 'TRANSACTION_ID'
      ? `Transaction ID given: ${input.transaction_id}.`
      : `Evidence sent: ${input.file_refs.length} file(s) (${input.evidence_type.toLowerCase().replace('_', ' ')}), held privately by Finance.`,
  ]
    .filter(Boolean)
    .join('\n');

/** The case's ticket if it is still open, else the buyer's open ticket linked to this payment. */
async function openTicketFor(kase: IFailedPaymentCase, userId: string, paymentDocId: string) {
  if (kase.ticket_id) {
    const own = await ticketService.statusOf(String(kase.ticket_id));
    if (own && (own.status === 'OPEN' || own.status === 'PENDING')) return own;
  }
  return ticketService.findOpenForPayment(userId, paymentDocId);
}

async function linkTicket(kase: IFailedPaymentCase, ticket: { id: string; ticket_no: string }) {
  await FailedPaymentCaseModel.updateOne(
    { _id: kase._id },
    { $set: { ticket_id: new Types.ObjectId(ticket.id), ticket_no: ticket.ticket_no, ticket_lock_at: null }, $inc: { revision: 1 } }
  );
}

/** Open (or reuse) the case's ticket under a short lock, so two claims at once make one ticket. */
async function ensureTicket(kase: IFailedPaymentCase, payment: IPayment, userId: string, input: SubmitClaimInput) {
  const open = await openTicketFor(kase, userId, String(payment._id));
  if (open) {
    if (String(kase.ticket_id ?? '') !== open.id) await linkTicket(kase, open);
    return { ticket_no: open.ticket_no, already_open: true };
  }
  const now = new Date();
  const locked = await FailedPaymentCaseModel.updateOne(
    { _id: kase._id, $or: [{ ticket_lock_at: null }, { ticket_lock_at: { $lt: new Date(now.getTime() - TICKET_LOCK_MS) } }] },
    { $set: { ticket_lock_at: now } }
  );
  if (locked.modifiedCount === 0) {
    throw new GraphQLError('Your support ticket is being opened. Please try again in a moment.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  try {
    const created = await ticketService.createTicket(userId, {
      subject: ticketSubject,
      category: 'PAYMENT',
      body_text: ticketBody(kase, input),
      pod_id: payment.pod_id ? String(payment.pod_id) : null,
      pod_title: kase.pod_title,
      payment_id: String(payment._id),
    });
    await linkTicket(kase, created);
    return { ticket_no: created.ticket_no, already_open: false };
  } catch (error) {
    await FailedPaymentCaseModel.updateOne({ _id: kase._id }, { $set: { ticket_lock_at: null } });
    throw error;
  }
}

/** A closed case comes back to life with new evidence — except one already refunded. */
async function reopenIfClosed(kase: IFailedPaymentCase): Promise<void> {
  if (kase.resolution.state === 'OPEN' || kase.resolution.state === 'REFUNDED') return;
  await FailedPaymentCaseModel.updateOne(
    { _id: kase._id, 'resolution.state': kase.resolution.state },
    { $set: { 'resolution.state': 'OPEN', 'resolution.at': null, review: null }, $inc: { revision: 1 } }
  );
}

export async function submitPaymentDeductionClaim(input: SubmitClaimInput, userId: string) {
  const payment = await ownPayment(input.payment_doc_id, userId);
  const files = evidenceFilesFor(input.evidence_type, input.file_refs, userId);
  const kase = await upsertCaseForPayment(payment, { source: 'CLAIM' });
  if (!kase) throw new GraphQLError('This payment cannot be claimed here.', { extensions: { code: 'BAD_USER_INPUT' } });

  const repeat = kase.claims.some((c) => c.client_request_id === input.client_request_id);
  if (kase.resolution.state === 'REFUNDED' || repeat) {
    const ticket = await openTicketFor(kase, userId, String(payment._id));
    return { case_id: String(kase._id), ticket_no: ticket?.ticket_no ?? kase.ticket_no, already_open: true };
  }
  if (kase.claims.length >= MAX_CLAIMS_PER_CASE) {
    throw new GraphQLError('We already have your evidence for this payment. Our support team will contact you.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  await reopenIfClosed(kase);
  await FailedPaymentCaseModel.updateOne(
    { _id: kase._id, 'claims.client_request_id': { $ne: input.client_request_id } },
    {
      $push: {
        claims: {
          evidence_type: input.evidence_type,
          files,
          transaction_id: input.evidence_type === 'TRANSACTION_ID' ? input.transaction_id : '',
          client_request_id: input.client_request_id,
          submitted_at: new Date(),
        },
      },
      $inc: { revision: 1 },
    }
  );
  const ticket = await ensureTicket(kase, payment, userId, input);
  await recordPaymentEvent({
    paymentDocId: payment._id,
    caseId: kase._id,
    type: 'CLAIM_SUBMITTED',
    source: 'CLIENT',
    data: { evidence_type: input.evidence_type, files: files.length, ticket_no: ticket.ticket_no, already_open: ticket.already_open },
    dedupeKey: `claim:${userId}:${input.client_request_id}`,
  });
  verifyInBackground(String(kase._id));
  return { case_id: String(kase._id), ticket_no: ticket.ticket_no, already_open: ticket.already_open };
}
