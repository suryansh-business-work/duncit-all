import { logs } from '@observability/log';
import { ticketService } from '@modules/support/ticket/ticket.service';
import type { IFailedPaymentCase } from './failedPaymentCase.model';
import { recordPaymentEvent } from './paymentEvent.service';
import type { ActorSnapshot } from './failedPayment.types';

/**
 * The support ticket a claim opened, closed when the case is: a refund that
 * landed, a rejection, a bank reversal. The SYSTEM bubble is what the buyer
 * reads in the thread, so it says plainly what happened and what comes next.
 *
 * Best-effort: the case decision is already saved, and a ticket that cannot be
 * updated is logged and left for Support rather than undoing Finance's work.
 */

export const forPod = (kase: Pick<IFailedPaymentCase, 'pod_title'>) => (kase.pod_title ? ` for ${kase.pod_title}` : '');

const money = (kase: Pick<IFailedPaymentCase, 'currency_symbol'>, paise: number) =>
  `${kase.currency_symbol}${(paise / 100).toFixed(2)}`;

export const ticketText = {
  refunded: (kase: IFailedPaymentCase, refundId: string, refundDays: string) =>
    `Your refund of ${money(kase, kase.refund.amount_paise)} for payment ${kase.payment_id} has been processed ` +
    `(Razorpay refund ${refundId}). It usually reaches your account within ${refundDays} business days.`,
  rejected: (kase: IFailedPaymentCase, note: string) =>
    `We reviewed your claim for payment ${kase.payment_id} and could not approve a refund. ${note}`.trim(),
  booked: (kase: IFailedPaymentCase) =>
    `Good news: your booking${forPod(kase)} is confirmed for payment ${kase.payment_id}, so no refund is due.`,
  notRefundable: (kase: IFailedPaymentCase, note: string) =>
    `Our payment gateway shows that payment ${kase.payment_id} was never captured, so no money reached Duncit. ` +
    `Your bank reverses such a debit automatically; if it has not come back, please ask your bank about it. ${note}`.trim(),
};

/** Resolve the case's ticket with `text`, filed under `actorId`. */
export async function resolveCaseTicket(
  kase: IFailedPaymentCase,
  actorId: string,
  text: string,
  actor: ActorSnapshot | null
): Promise<void> {
  if (!kase.ticket_id || !actorId) return;
  try {
    await ticketService.systemResolve(String(kase.ticket_id), actorId, text);
    await recordPaymentEvent({
      paymentDocId: kase.payment_doc_id,
      caseId: kase._id,
      type: 'TICKET_RESOLVED',
      source: actor ? 'FINANCE' : 'SYSTEM',
      actor,
      data: { ticket_no: kase.ticket_no, state: kase.resolution.state },
      dedupeKey: `ticket-resolved:${String(kase._id)}:${kase.resolution.state}`,
    });
  } catch (error) {
    logs.server.warn('failedPayment', 'resolveCaseTicket', { error, case_id: String(kase._id), ticket_no: kase.ticket_no });
  }
}
