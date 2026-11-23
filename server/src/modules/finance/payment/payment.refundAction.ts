/**
 * Finance pressing Refund on a refund the Refund area shows as owed: "send it
 * back to the same source", with a note on record.
 *
 * This is deliberately NOT a new way to move money. Every kind hands over to the
 * engine that already owns that refund and already makes it safe to repeat:
 *  - pod payment / payment / rented item → the gateway outbox (one claim, adopt
 *    the refund if it already reached Razorpay, sent against the payment's own
 *    Razorpay id — the money can only go back to where it came from);
 *  - pod shop → the order's or the return's own retry (receipt look-up first);
 *  - failed payment → the case's refund (conditional claim, live Razorpay check).
 * What this adds is the guard in front and the trail behind: the entry must be
 * on the payment right now and eligible by the server's own rule — the client's
 * word is never trusted — the caller's role must allow its kind, and one
 * REFUND_REQUESTED event carrying who, which refund and the note is written to
 * the payment's audit trail before anything is sent. The engines then write their
 * own steps (requested, initiated, processed, failed) on the same trail, and the
 * refund's own record, the Razorpay refund id and the coin ledger keep updating
 * as they always did.
 */
import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { actorOf } from '@modules/finance/failedPayment/failedPayment.actor';
import { recordPaymentEvent } from '@modules/finance/failedPayment/paymentEvent.service';
import { retryGatewayRefund } from './payment.gatewayRefund';
import { paymentRefundSections, refundViewerFor } from './payment.refundSections.service';
import type { RefundEntry, RefundKind } from './payment.refundSections';

export interface RefundToSourceInput {
  payment_doc_id: string;
  kind: RefundKind;
  entry_id: string;
  note: string;
  client_request_id?: string;
}

const fail = (message: string, code: string) => new GraphQLError(message, { extensions: { code } });

/** What the person pressing Refund is told when the row is not one the server will send. */
function refusal(entry: RefundEntry): GraphQLError {
  if (entry.state === 'COMPLETED') return fail('This refund has already been sent.', 'CONFLICT');
  if (entry.status === 'HELD') {
    return fail('This cancellation refund is held and is released automatically when the pod starts.', 'BAD_USER_INPUT');
  }
  if (entry.status === 'PROCESSING' || entry.status === 'SENDING' || entry.status === 'PENDING') {
    return fail('This refund is already on its way. Reload in a few minutes to see where it stands.', 'CONFLICT');
  }
  return fail('This refund cannot be sent from here.', 'BAD_USER_INPUT');
}

/** One REFUND_REQUESTED row per press — repeated presses of the same request collapse into one. */
const dedupeKeyOf = (input: RefundToSourceInput, entry: RefundEntry) =>
  input.client_request_id
    ? `finance_press:${input.client_request_id}`
    : `finance_press:${entry.id}:${entry.status}:${entry.attempts}`;

async function send(
  input: RefundToSourceInput,
  entry: RefundEntry,
  user: AuthUser,
  actor: Awaited<ReturnType<typeof actorOf>>
): Promise<void> {
  switch (input.kind) {
    case 'POD_PAYMENT':
    case 'PAYMENT':
    case 'RENTAL':
      await retryGatewayRefund(entry.id);
      return;
    case 'POD_SHOP':
      if (entry.source === 'RETURN') {
        const { podShopReturnService } = await import('@modules/commerce/podShopReturn/podShopReturn.service');
        await podShopReturnService.retryRefund({ kind: 'STAFF', userId: user.id, label: user.email ?? user.id }, entry.id);
      } else {
        const { retryOrderRefund } = await import('@modules/commerce/productOrder/productOrder.cancel');
        await retryOrderRefund(entry.id);
      }
      return;
    case 'FAILED_PAYMENT': {
      const { initiateFailedPaymentRefund } = await import('@modules/finance/failedPayment/failedPayment.refund');
      await initiateFailedPaymentRefund(entry.id, input.client_request_id || `payment-detail:${entry.id}:${entry.attempts}`, actor);
      return;
    }
    default:
      // The e-commerce store pays out by hand and coins are a ledger — nothing here can send them.
      throw fail('This refund is paid out by hand, not from here.', 'BAD_USER_INPUT');
  }
}

/** Sends the refund, or throws why not. The caller answers with the payment's fresh audit. */
export async function refundToSource(input: RefundToSourceInput, user: AuthUser): Promise<void> {
  const viewer = refundViewerFor(user);
  if (!viewer.can(input.kind)) throw fail('Access Denied', 'FORBIDDEN');

  // Read back from the database — never from the client — what is owed and whether it is safe to send.
  const sections = await paymentRefundSections(input.payment_doc_id, viewer);
  const entry = sections.find((s) => s.kind === input.kind)?.entries.find((e) => e.id === input.entry_id);
  if (!entry) throw fail('This refund is no longer on the payment. Reload the page.', 'NOT_FOUND');
  if (!entry.can_refund) throw refusal(entry);

  const actor = await actorOf(user);
  await recordPaymentEvent({
    paymentDocId: input.payment_doc_id,
    caseId: input.kind === 'FAILED_PAYMENT' ? entry.id : null,
    type: 'REFUND_REQUESTED',
    source: 'FINANCE',
    actor,
    data: {
      kind: input.kind,
      entry_id: entry.id,
      entry_status: entry.status,
      amount: entry.amount,
      note: input.note,
      via: 'PAYMENT_DETAIL',
    },
    dedupeKey: dedupeKeyOf(input, entry),
  });
  logs.server.info('payment', 'refundToSource', {
    payment_doc_id: input.payment_doc_id,
    kind: input.kind,
    entry_id: entry.id,
    actor_id: actor.id,
    msg: 'refund sent back to its source by Finance',
  });
  await send(input, entry, user, actor);
}
