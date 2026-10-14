/**
 * "Cancel the spot" — the only way out of a FREE pod.
 *
 * A free pod has no backout and no refund of any kind (rule 4 of the free-pod
 * brief). Leaving one is therefore not a BackoutRequest: no request row, no
 * attempt counted against Admin > Pod Settings' limit, no refund state, no
 * "your spot was filled" message. The member's seats go straight back on the
 * pod, their ticket stops scanning, and they may join again — any number of
 * times — on the SAME membership row, which is re-activated rather than copied
 * so a join/cancel loop cannot grow the collection without bound.
 *
 * The membership row is the single point every concurrent caller races on:
 * each transition is a conditional write on its status (JOINED ⇄ BACKED_OUT),
 * so a double-submitted cancel releases the seats once and a double-submitted
 * join claims them once. On a replica set (Atlas) each transition also runs in
 * a transaction, so the row, the pod's seat counters and the ticket commit
 * together; on a standalone mongod the same steps run in an order that leaves
 * the counters right even without one (see each function).
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodMemberModel, type IPodMember, type JoinSource } from './podMember.model';
import { BackoutRequestModel } from './backoutRequest.model';
import { claimSeats, releaseSeats } from '@modules/pods/pod/pod.seats.service';
import { normalizeSeats } from '@modules/pods/pod/pod.seats';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { withTransaction } from '@utils/mongoTransaction';
import { logs } from '@observability/log';

/** Shown when a checked-in member tries to cancel: attendance drives the
 * leaderboard and badges, so a cancel must never be a way to erase a scan. */
export const CHECKED_IN_CANCEL_MESSAGE =
  'You have already been checked in at this pod, so your spot can no longer be cancelled.';

/** The pod's own start has passed — the same clock `backout` and `joinFree` use. */
export const podHasStarted = (pod: { pod_date_time?: Date | null }) =>
  !!pod.pod_date_time && pod.pod_date_time.getTime() < Date.now();

/**
 * Release the caller's spot on a free pod. Returns the cancelled membership,
 * or — when another request already cancelled it — that same cancelled row,
 * so a double submit answers the same thing twice.
 *
 * The caller has already checked the pod is FREE and has not started.
 *
 * Order (matters without a transaction): the ticket is voided first, guarded on
 * it not being CHECKED_IN, so a scanned member is refused before anything
 * moves; then the membership flips JOINED → BACKED_OUT in one conditional
 * write — only the request that wins it goes on to release the seats, which is
 * what keeps the seat counters from being released twice.
 */
export async function cancelFreeSpot(podId: Types.ObjectId, userId: string): Promise<IPodMember> {
  const uid = new Types.ObjectId(userId);
  const cancelled = await withTransaction(async (session) => {
    const membership = await PodMemberModel.findOne({ pod_id: podId, user_id: uid, status: 'JOINED' }).session(
      session ?? null
    );
    if (!membership) return null;

    const ticket = await TicketModel.findOne({ membership_id: membership._id }).session(session ?? null);
    if (ticket) {
      const voided = await TicketModel.findOneAndUpdate(
        { _id: ticket._id, status: { $ne: 'CHECKED_IN' } },
        { $set: { status: 'CANCELLED' } },
        { new: true, session }
      );
      if (!voided) {
        throw new GraphQLError(CHECKED_IN_CANCEL_MESSAGE, { extensions: { code: 'ALREADY_CHECKED_IN' } });
      }
    }

    const now = new Date();
    const flipped = await PodMemberModel.findOneAndUpdate(
      { _id: membership._id, status: 'JOINED' },
      {
        $set: {
          status: 'BACKED_OUT',
          backed_out_at: now,
          spot_cancelled_at: now,
          refund_status: 'NONE',
          active_backout_id: null,
        },
        $inc: { spot_cancel_count: 1 },
      },
      { new: true, session }
    );
    // Lost the race to a concurrent cancel: that request releases the seats.
    if (!flipped) return null;
    await releaseSeats(podId, userId, normalizeSeats(flipped.seats ?? 1), session);
    return flipped;
  });

  if (cancelled) {
    logs.server.info('podMember', 'cancelFreeSpot', {
      pod_id: String(podId),
      membership_id: String(cancelled._id),
      seats: normalizeSeats(cancelled.seats ?? 1),
      cancel_count: cancelled.spot_cancel_count,
      msg: 'free pod spot cancelled',
    });
    return cancelled;
  }
  // Nothing JOINED to cancel. A spot this member already cancelled is the
  // answer to a repeated submit; anything else means they were never in.
  const already = await PodMemberModel.findOne({
    pod_id: podId,
    user_id: uid,
    status: 'BACKED_OUT',
    spot_cancelled_at: { $ne: null },
  }).sort({ spot_cancelled_at: -1 });
  if (already) return already;
  throw new GraphQLError('You are not a member of this pod', { extensions: { code: 'NOT_FOUND' } });
}

/** The row a re-join on a free pod brings back: the member's own earlier,
 * unpaid booking that is no longer JOINED — a cancelled spot, or a backout
 * raised on the pod before free pods lost backouts. */
export async function findReusableFreeMembership(podId: Types.ObjectId, userId: string) {
  return PodMemberModel.findOne({
    pod_id: podId,
    user_id: new Types.ObjectId(userId),
    status: { $in: ['BACKED_OUT', 'BACKOUT_IN_PROCESS'] },
    payment_id: null,
  }).sort({ updated_at: -1 });
}

interface Reactivation {
  seats: number;
  source: JoinSource;
  referredBy: Types.ObjectId | null;
}

/**
 * Join a free pod again on the member's existing row.
 *
 * Order (matters without a transaction): the row flips back to JOINED in one
 * conditional write first — so of two concurrent joins only one ever claims
 * seats — and then the seats are claimed. If the pod filled meanwhile the claim
 * throws POD_FULL and the row is flipped back exactly as it was. Returns null
 * when a concurrent join won the flip; the caller then reads the JOINED row.
 *
 * A legacy backout still open on the row is closed (CANCELLED): the member is
 * back in, so nothing is left for a later join to "fill".
 */
export async function reactivateFreeMembership(
  previous: IPodMember,
  podId: Types.ObjectId,
  userId: string,
  join: Reactivation
): Promise<IPodMember | null> {
  const now = new Date();
  const restore = {
    status: previous.status,
    seats: previous.seats,
    joined_at: previous.joined_at,
    backed_out_at: previous.backed_out_at,
    spot_cancelled_at: previous.spot_cancelled_at ?? null,
    source: previous.source,
    referred_by: previous.referred_by,
    refund_status: previous.refund_status,
    active_backout_id: previous.active_backout_id,
  };
  const joined = await withTransaction(async (session) => {
    const flipped = await PodMemberModel.findOneAndUpdate(
      { _id: previous._id, status: previous.status },
      {
        $set: {
          status: 'JOINED',
          seats: join.seats,
          joined_at: now,
          backed_out_at: null,
          spot_cancelled_at: null,
          source: join.source,
          referred_by: join.referredBy,
          refund_status: 'NONE',
          active_backout_id: null,
        },
      },
      { new: true, session }
    );
    if (!flipped) return null;
    try {
      await claimSeats(podId, userId, join.seats, session);
    } catch (e) {
      // In a transaction the abort undoes the flip; without one, undo it here.
      if (!session) {
        await PodMemberModel.updateOne({ _id: previous._id, status: 'JOINED', joined_at: now }, { $set: restore });
      }
      throw e;
    }
    // The same ticket admits them again: its QR is valid once more.
    await TicketModel.updateOne(
      { membership_id: previous._id, status: 'CANCELLED' },
      { $set: { status: 'VALID', seats: join.seats } },
      { session }
    );
    return flipped;
  });
  if (!joined) return null;

  const open = await BackoutRequestModel.find({ member_id: previous._id, status: 'IN_PROCESS' });
  for (const request of open) {
    request.status = 'CANCELLED';
    request.events.push({ status: 'CANCELLED', backout_count: request.attempt_no, at: new Date() });
    await request.save();
  }
  logs.server.info('podMember', 'rejoinFreeSpot', {
    pod_id: String(podId),
    membership_id: String(joined._id),
    seats: join.seats,
    closed_backouts: open.length,
    msg: 'free pod spot re-joined on the existing booking',
  });
  return joined;
}
