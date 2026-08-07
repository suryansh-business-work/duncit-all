import { Types } from 'mongoose';
import { PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { BackoutRequestModel } from './backoutRequest.model';

/**
 * The three things the pod-history timeline needs and the membership does not
 * carry: what the person asked for, whether they turned up, and whether the
 * pod survived at all.
 *
 * Resolved per booking rather than folded into the membership row, so the list
 * query stays the cheap thing it is — only a screen that draws a timeline pays
 * for one.
 */

/** Mirrors PodCancelKind in the finance schema; the audit source decides it. */
export type PodCancelActorKind = 'HOST' | 'VENUE' | 'CLUB_ADMIN' | 'ADMIN' | 'SYSTEM';

const KIND_BY_DELETE_SOURCE: Record<string, PodCancelActorKind> = {
  HOST: 'HOST',
  ADMIN: 'ADMIN',
  CLUB_ADMIN: 'CLUB_ADMIN',
  SYSTEM: 'SYSTEM',
  VENUE_OWNER: 'VENUE',
};

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
 * Did they turn up?
 *
 * The ticket is the only record of it: attendance happens when a host scans at
 * the door, and nothing writes it back to the membership. A booking with no
 * ticket has not been scanned, which reads the same as not attending.
 */
export async function attendanceForMembership(memberId: string) {
  if (!Types.ObjectId.isValid(memberId)) return { attended: false, attended_at: null };
  const ticket = await TicketModel.findOne({ membership_id: new Types.ObjectId(memberId) })
    .select('status checked_in_at')
    .lean();
  return {
    attended: ticket?.status === 'CHECKED_IN',
    attended_at: ticket?.checked_in_at?.toISOString?.() ?? null,
  };
}

/**
 * Whether the pod itself was cancelled, and by whom.
 *
 * Two different endings wear the same face from here: a pod somebody deleted,
 * and a pod the venue declined and never took back. The audit row is what names
 * the actor — the pod itself only records that it is gone.
 */
export async function cancellationForPod(podId: string) {
  if (!Types.ObjectId.isValid(podId)) return { cancelled_by: null, cancelled_at: null };
  const pod = await PodModel.findById(podId).select('deleted_at status').lean();
  if (!pod) return { cancelled_by: null, cancelled_at: null };

  const deleted = Boolean((pod as { deleted_at?: Date | null }).deleted_at);
  const declined = (pod as { status?: string }).status === 'DECLINED';
  if (!deleted && !declined) return { cancelled_by: null, cancelled_at: null };

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
      null,
  };
}
