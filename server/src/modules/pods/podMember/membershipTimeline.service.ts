import { Types } from 'mongoose';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { BackoutRequestModel } from './backoutRequest.model';

/**
 * The things the participation timeline needs and the membership does not
 * carry: what the person asked for, whether anybody took attendance, and
 * whether the pod survived at all.
 *
 * Resolved per booking rather than folded into the membership row, so the list
 * query stays the cheap thing it is — only a screen that draws a timeline pays
 * for one.
 */

/** Mirrors PodCancelKind in the finance schema; the audit source decides it. */
export type PodCancelActorKind = 'HOST' | 'VENUE' | 'CLUB_ADMIN' | 'ADMIN' | 'SYSTEM';

/** Same four states Finance shows for a request. */
export type RefundStatusKind = 'NONE' | 'PENDING' | 'PROCESSED' | 'NOT_ELIGIBLE';

const KIND_BY_DELETE_SOURCE: Record<string, PodCancelActorKind> = {
  HOST: 'HOST',
  ADMIN: 'ADMIN',
  CLUB_ADMIN: 'CLUB_ADMIN',
  SYSTEM: 'SYSTEM',
  VENUE_OWNER: 'VENUE',
};

/**
 * Where one request's money stands — the same derivation Finance's list uses.
 *
 * It has to be the same one: the timeline claims to be showing the state of the
 * row Finance is looking at, and a booking with no payment behind it is never
 * eligible however long it waits.
 */
function refundStatusForRequest(row: {
  refund_processed_at?: Date | null;
  payment_id?: unknown;
  status: string;
}): RefundStatusKind {
  if (row.refund_processed_at) return 'PROCESSED';
  if (!row.payment_id) return 'NOT_ELIGIBLE';
  if (row.status === 'SPOT_FILLED') return 'PENDING';
  return 'NONE';
}

/**
 * Every backout this booking raised, oldest first.
 *
 * Oldest first because the timeline reads downwards and a pod allows several
 * attempts — the order they happened in IS the story. Each row keeps its
 * DUN-BKO id, which is what ties a line on this screen to a row on Finance's
 * User Backout Refunds page.
 */
export async function backoutsForMembership(memberId: string) {
  if (!Types.ObjectId.isValid(memberId)) return [];
  const rows = await BackoutRequestModel.find({ member_id: new Types.ObjectId(memberId) })
    .sort({ created_at: 1 })
    .lean();

  return rows.map((row) => ({
    backout_no: row.backout_no,
    status: row.status,
    attempt_no: row.attempt_no ?? 1,
    seats: row.seats ?? 1,
    seats_before: row.seats_before ?? 1,
    refund_amount: row.refund_amount ?? null,
    coins_paid: row.coins_paid ?? 0,
    coins_refunded: row.coins_refunded ?? 0,
    refund_status: refundStatusForRequest(row),
    deduction_pct: row.deduction_pct ?? 0,
    refund_processed_at: row.refund_processed_at?.toISOString?.() ?? null,
    created_at: row.created_at?.toISOString?.() ?? '',
    events: (row.events ?? []).map((event) => ({
      status: event.status,
      at: event.at?.toISOString?.() ?? '',
    })),
  }));
}

/**
 * One booking's whole story, assembled once.
 *
 * One call rather than five field resolvers: the old shape asked for the ticket
 * twice and the pod twice for every booking on the list, which is a few hundred
 * round trips for one Pod History screen.
 */
export async function participationForMembership(input: {
  memberId?: string | null;
  podId: string;
  joinedAt: string | null;
  /** The join payment, so a cancelled pod can say what happened to the money. */
  paymentId?: string | null;
}) {
  const { memberId, podId, joinedAt } = input;
  if (!memberId) return null;
  const [backouts, attendance, cancellation] = await Promise.all([
    backoutsForMembership(memberId),
    attendanceForMembership(memberId, podId),
    cancellationForPod(podId),
  ]);
  const cancelRefund = cancellation.cancelled_by
    ? await cancellationRefundForPayment(input.paymentId)
    : 'NONE';
  return {
    joined_at: joinedAt ?? '',
    attended: attendance.attended,
    attended_at: attendance.attended_at,
    attendance_recorded: attendance.attendance_recorded,
    pod_cancelled_by: cancellation.cancelled_by,
    pod_cancelled_at: cancellation.cancelled_at,
    cancel_refund_status: cancelRefund,
    backouts,
  };
}

/**
 * Did they turn up, and did anybody check?
 *
 * The ticket is the only record of it: attendance happens when a host scans at
 * the door, and nothing writes it back to the membership. A pod where NOBODY
 * was scanned — a virtual pod, or a host who never opened the scanner — is a
 * pod where attendance was never taken, which is not the same as not turning
 * up. Telling someone who ran the session that they did not attend is worse
 * than saying nothing, so the two cases are kept apart.
 */
export async function attendanceForMembership(memberId: string, podId?: string) {
  if (!Types.ObjectId.isValid(memberId)) {
    return { attended: false, attended_at: null, attendance_recorded: false };
  }
  const ticket = await TicketModel.findOne({ membership_id: new Types.ObjectId(memberId) })
    .select('status checked_in_at')
    .lean();
  const attended = ticket?.status === 'CHECKED_IN';
  if (attended) {
    return {
      attended: true,
      attended_at: ticket?.checked_in_at?.toISOString?.() ?? null,
      attendance_recorded: true,
    };
  }

  const scanned =
    podId && Types.ObjectId.isValid(podId)
      ? await TicketModel.exists({ pod_id: new Types.ObjectId(podId), status: 'CHECKED_IN' })
      : null;
  return { attended: false, attended_at: null, attendance_recorded: Boolean(scanned) };
}

/**
 * Whether the pod itself was cancelled, and by whom.
 *
 * Two different endings wear the same face from here: a pod somebody deleted,
 * and a pod the venue declined and never took back. The audit row is what names
 * the actor — the pod itself only records that it is gone.
 *
 * `includeDeleted` is the whole point: the model's own pre-find hook filters
 * deleted pods out, so without it this asked "was the pod cancelled" of a query
 * that can only return pods that were not.
 */
export async function cancellationForPod(podId: string) {
  const none = { cancelled_by: null, cancelled_at: null };
  if (!Types.ObjectId.isValid(podId)) return none;
  const pod = await PodModel.findById(podId)
    .setOptions({ includeDeleted: true })
    .select('deleted_at venue_approval_status updated_at')
    .lean();
  if (!pod) return none;

  const deleted = Boolean((pod as { deleted_at?: Date | null }).deleted_at);
  // The pod-level flag is venue_approval_status; `status` only exists inside
  // the co_hosts sub-document, so testing it never matched anything.
  const declined = (pod as { venue_approval_status?: string }).venue_approval_status === 'DECLINED';
  if (!deleted && !declined) return none;

  const audit = await PodAuditLogModel.findOne({
    pod_id: new Types.ObjectId(podId),
    action: deleted ? 'DELETE' : 'VENUE_DECLINED',
  })
    .sort({ created_at: -1 })
    .select('source created_at')
    .lean();

  const cancelledBy: PodCancelActorKind = deleted
    ? KIND_BY_DELETE_SOURCE[(audit as { source?: string })?.source ?? ''] ?? 'SYSTEM'
    : 'VENUE';

  return {
    cancelled_by: cancelledBy,
    cancelled_at:
      (audit as { created_at?: Date })?.created_at?.toISOString?.() ??
      (pod as { deleted_at?: Date }).deleted_at?.toISOString?.() ??
      (pod as { updated_at?: Date }).updated_at?.toISOString?.() ??
      null,
  };
}

/**
 * What a cancelled pod did to THIS booking's money.
 *
 * Only some cancel paths refund: the host and venue paths do, a club-admin
 * delete does not, and a free booking has nothing to give back. The payment is
 * the only honest source — the membership's refund_status is never written on
 * cancellation at all.
 */
export async function cancellationRefundForPayment(
  paymentId?: string | null,
): Promise<RefundStatusKind> {
  // A free booking has nothing to give back — that is not a refund still coming.
  if (!paymentId || !Types.ObjectId.isValid(paymentId)) return 'NOT_ELIGIBLE';
  const payment = await PaymentModel.findById(paymentId).select('status').lean();
  if (!payment) return 'NOT_ELIGIBLE';
  return (payment as { status?: string }).status === 'REFUNDED' ? 'PROCESSED' : 'PENDING';
}
