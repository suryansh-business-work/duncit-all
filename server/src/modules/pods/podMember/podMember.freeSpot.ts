/**
 * "Cancel the spot" — the only way out of a FREE pod.
 *
 * A free pod has no backout and no refund of any kind (rule 4 of the free-pod
 * brief). Leaving one is therefore not a BackoutRequest: no request row, no
 * backout attempt counted, no refund state, no "your spot was filled"
 * message. The member's seats go straight back on the pod, their ticket stops
 * scanning, and they may join again on the SAME membership row, which is
 * re-activated rather than copied so a join/cancel loop cannot grow the
 * collection without bound.
 *
 * Cancelling is capped (owner, 2026-10-15): a member may cancel their spot on
 * one pod at most Admin > Pods > Pod Settings' `max_free_spot_cancellations`
 * times, counted on the row's `spot_cancel_count` — which survives every
 * re-join because the row is re-activated, never copied. Once it is used up
 * the cancel is refused and the member keeps their spot. Joining again is
 * never refused by it.
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
import {
  PodMemberModel,
  isConcurrentFreeJoinError,
  isDuplicateKeyError,
  type IPodMember,
  type JoinSource,
} from './podMember.model';
import { BackoutRequestModel } from './backoutRequest.model';
import { claimSeats, releaseSeats } from '@modules/pods/pod/pod.seats.service';
import { normalizeSeats } from '@modules/pods/pod/pod.seats';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { withTransaction } from '@utils/mongoTransaction';
import { logs } from '@observability/log';
import { rentalLifecycleService } from '@modules/venues/venueRental/rentalLifecycle.service';

/** Shown when a checked-in member tries to cancel: attendance drives the
 * leaderboard and badges, so a cancel must never be a way to erase a scan. */
export const CHECKED_IN_CANCEL_MESSAGE =
  'You have already been checked in at this pod, so your spot can no longer be cancelled.';

/** Shown when the member has used every spot cancellation this pod allows. */
export const CANCEL_LIMIT_MESSAGE =
  'You have cancelled your spot on this pod the maximum number of times allowed, so it can no longer be cancelled.';

const cancelLimitError = () =>
  new GraphQLError(CANCEL_LIMIT_MESSAGE, { extensions: { code: 'CANCEL_LIMIT_REACHED' } });

/** The pod's own start has passed — the same clock `backout` and `joinFree` use. */
export const podHasStarted = (pod: { pod_date_time?: Date | null }) =>
  !!pod.pod_date_time && pod.pod_date_time.getTime() < Date.now();

/**
 * Release the caller's spot on a free pod. Returns the cancelled membership,
 * or — when another request already cancelled it — that same cancelled row,
 * so a double submit answers the same thing twice.
 *
 * The caller has already checked the pod is FREE and has not started, and
 * passes the cancellation cap (Pod Settings) — this function enforces it.
 *
 * Order (matters without a transaction): the ticket is voided first, guarded on
 * it not being CHECKED_IN, so a scanned member is refused before anything
 * moves; then the membership flips JOINED → BACKED_OUT in one conditional
 * write — only the request that wins it goes on to release the seats, which is
 * what keeps the seat counters from being released twice.
 *
 * The cap is checked on the read (refused before anything moves) AND in the
 * flip's filter (`spot_cancel_count` not >= max), so no interleaving of
 * cancels and re-joins can ever take the count past it.
 */
export async function cancelFreeSpot(
  podId: Types.ObjectId,
  userId: string,
  maxCancels: number
): Promise<IPodMember> {
  const uid = new Types.ObjectId(userId);
  const cancelled = await withTransaction(async (session) => {
    const membership = await PodMemberModel.findOne({ pod_id: podId, user_id: uid, status: 'JOINED' }).session(
      session ?? null
    );
    if (!membership) return null;
    if ((membership.spot_cancel_count ?? 0) >= maxCancels) throw cancelLimitError();

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
      { _id: membership._id, status: 'JOINED', spot_cancel_count: { $not: { $gte: maxCancels } } },
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
    if (!flipped) {
      // Still JOINED means the cap filtered the flip out: refuse, and (without
      // a transaction to abort) give the ticket voided above its QR back.
      const still = await PodMemberModel.exists({ _id: membership._id, status: 'JOINED' }).session(
        session ?? null
      );
      if (still) {
        if (!session && ticket) {
          await TicketModel.updateOne({ _id: ticket._id, status: 'CANCELLED' }, { $set: { status: ticket.status } });
        }
        throw cancelLimitError();
      }
      // Lost the race to a concurrent cancel: that request releases the seats.
      return null;
    }
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
    // Items rented with the spot go back to the pod, their money owed back to the guest.
    if (cancelled.payment_id) {
      await rentalLifecycleService.releaseForPayment(cancelled.payment_id).catch((error: unknown) => {
        logs.server.error('podMember', 'cancelFreeSpot', { error, msg: 'rental release failed' });
      });
    }
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

/**
 * Run a booking write and answer null when the one-unpaid-booking index refused
 * it: another request already holds this person's JOINED booking on the pod.
 *
 * Nothing is given back on that path, on purpose. The seat a free booking holds
 * is the person's id in `pod_attendees` — an identity, not a per-row share — so
 * the winner's booking is sitting on it, and releasing it would leave that
 * booking JOINED with no seat. In a transaction the abort has already undone
 * this attempt; without one, this attempt's claim and the winner's listed the
 * same id once between them (a free booking is one seat, so no extra was
 * counted), and that one entry is the winner's seat.
 */
async function lostToConcurrentBooking<T>(
  podId: Types.ObjectId,
  write: () => Promise<T>
): Promise<T | null> {
  try {
    return await write();
  } catch (error) {
    // Only the one-unpaid-booking index means "a concurrent join won"; any other
    // unique index refusing the write is a real failure and must surface.
    if (!isConcurrentFreeJoinError(error)) throw error;
    logs.server.warn('podMember', 'joinFreeConcurrent', {
      pod_id: podId.toString(),
      msg: 'a concurrent free join already holds the booking — answering with it',
    });
    return null;
  }
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
 * when a concurrent join won — the flip found the row already JOINED, or the
 * one-unpaid-booking index refused it because another row is JOINED — and the
 * caller then reads the JOINED row.
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
  const joined = await lostToConcurrentBooking(podId, () => withTransaction(async (session) => {
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
  }));
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

/**
 * A member's first booking on a free pod: the seat claim and the new row.
 *
 * The claim goes first — it is the gate that can still fail (POD_FULL) — and in
 * a transaction both commit together. Returns null when a concurrent join wrote
 * this person's booking first (the one-unpaid-booking index refuses the second
 * row); the caller then answers with that booking.
 *
 * Without a transaction, any other failure of the row gives the seat back, as
 * before: no booking was made, so nobody else holds it.
 */
export async function createFreeMembership(
  podId: Types.ObjectId,
  userId: string,
  join: Reactivation
): Promise<IPodMember | null> {
  return lostToConcurrentBooking(podId, () =>
    withTransaction(async (session) => {
      await claimSeats(podId, userId, join.seats, session);
      try {
        // The array form is required with a session (and returns an array).
        const [doc] = await PodMemberModel.create(
          [
            {
              pod_id: podId,
              user_id: new Types.ObjectId(userId),
              status: 'JOINED',
              seats: join.seats,
              joined_at: new Date(),
              source: join.source,
              referred_by: join.referredBy,
              refund_status: 'NONE',
            },
          ],
          { session }
        );
        return doc;
      } catch (e) {
        if (!session && !isDuplicateKeyError(e)) await releaseSeats(podId, userId, join.seats);
        throw e;
      }
    })
  );
}
