import { GraphQLError } from 'graphql';
import { FailedPaymentCaseModel, type IFailedPaymentCase } from './failedPaymentCase.model';
import { recordPaymentEvent } from './paymentEvent.service';
import { resolveCaseTicket, ticketText } from './failedPayment.ticket';
import type { MarkNotRefundableInput, ReviewInput } from './failedPayment.validator';
import type { ActorSnapshot } from './failedPayment.types';

/**
 * Finance's two decisions that are not a refund: Review (approve a yellow case
 * so it can be refunded, or reject it and close the ticket with the note) and
 * Not refundable (Razorpay never captured the money — the bank reverses it).
 *
 * Both are single conditional writes on an OPEN case with no refund under way,
 * so a decision can never land on a case that is being, or has been, refunded.
 * A repeat carrying the same client_request_id is answered with the case as it
 * stands instead of being applied twice.
 */

const OPEN_AND_IDLE = { 'resolution.state': 'OPEN', 'refund.status': { $in: ['', 'FAILED'] } };

const notFound = () => new GraphQLError('Failed payment not found', { extensions: { code: 'NOT_FOUND' } });
const conflict = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

async function loadCase(caseId: string): Promise<IFailedPaymentCase> {
  const kase = await FailedPaymentCaseModel.findById(caseId);
  if (!kase) throw notFound();
  return kase;
}

export async function reviewFailedPayment(input: ReviewInput, actor: ActorSnapshot): Promise<IFailedPaymentCase> {
  const current = await loadCase(input.case_id);
  if (input.client_request_id && current.review?.client_request_id === input.client_request_id) return current;
  const now = new Date();
  const set: Record<string, unknown> = {
    review: {
      decision: input.decision,
      note: input.note,
      by: actor.id,
      by_name: actor.name,
      client_request_id: input.client_request_id,
      at: now,
    },
  };
  if (input.decision === 'REJECTED') {
    Object.assign(set, {
      'resolution.state': 'REJECTED',
      'resolution.at': now,
      'resolution.by': actor.id,
      'resolution.by_name': actor.name,
      'resolution.note': input.note,
      'resolution.client_request_id': input.client_request_id,
    });
  }
  const kase = await FailedPaymentCaseModel.findOneAndUpdate(
    { _id: input.case_id, ...OPEN_AND_IDLE },
    { $set: set, $inc: { revision: 1 } },
    { new: true }
  );
  if (!kase) throw conflict('This case is closed or its refund is under way, so it can no longer be reviewed.');
  await recordPaymentEvent({
    paymentDocId: kase.payment_doc_id,
    caseId: kase._id,
    type: input.decision === 'APPROVED' ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED',
    source: 'FINANCE',
    actor,
    data: { note: input.note },
  });
  if (input.decision === 'REJECTED') await resolveCaseTicket(kase, actor.id, ticketText.rejected(kase, input.note), actor);
  return kase;
}

export async function markFailedPaymentNotRefundable(input: MarkNotRefundableInput, actor: ActorSnapshot): Promise<IFailedPaymentCase> {
  const current = await loadCase(input.case_id);
  if (input.client_request_id && current.resolution.client_request_id === input.client_request_id) return current;
  const now = new Date();
  const kase = await FailedPaymentCaseModel.findOneAndUpdate(
    // No refund was ever attempted: money Razorpay never captured cannot have gone back.
    { _id: input.case_id, 'resolution.state': 'OPEN', 'verification.status': 'NOT_CAPTURED', 'refund.status': '' },
    {
      $set: {
        'resolution.state': 'NOT_REFUNDABLE',
        'resolution.at': now,
        'resolution.by': actor.id,
        'resolution.by_name': actor.name,
        'resolution.note': input.note,
        'resolution.client_request_id': input.client_request_id,
      },
      $inc: { revision: 1 },
    },
    { new: true }
  );
  if (!kase) throw conflict('Only an open case Razorpay shows as never captured can be closed as not refundable.');
  await recordPaymentEvent({
    paymentDocId: kase.payment_doc_id,
    caseId: kase._id,
    type: 'MARKED_NOT_REFUNDABLE',
    source: 'FINANCE',
    actor,
    data: { note: input.note },
  });
  await resolveCaseTicket(kase, actor.id, ticketText.notRefundable(kase, input.note), actor);
  return kase;
}
