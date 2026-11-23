import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { PodModel } from '@modules/pods/pod/pod.model';
import { podLiveEnd } from '@modules/pods/pod/pod.lifecycle';
import { managedVenue } from '@modules/venues/venueFood/venueFoodOrder.shared';
import { rentalSettingsService } from './rentalSettings.service';
import { RentalBookingModel, rentalEventPush, type IRentalBooking } from './rentalBooking.model';
import { RentalStockModel } from './rentalStock.model';
import { settleRentalOutcome, type RentalOutcome } from './rentalOutcome';
import { queueRentalRefund } from './rentalRefund.service';
import { notifyRentalReturned, notifyRentalsBooked, notifyRentalsEnded } from './rentalNotify';

/**
 * Everything that closes a rental after capture. Every transition is a
 * conditional update from BOOKED, so two hands (the venue and the sweep, two
 * tabs) can never close the same booking twice or settle it two ways. A close
 * that owes the guest money queues its Razorpay refund straight away (the
 * refund sweep is the backstop), and the guest and venue are told.
 */

const DAY_MS = 86_400_000;
const NOTE_MAX = 500;

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

const holderOf = (b: Pick<IRentalBooking, 'payment_doc_id' | 'item_id'>) => `${String(b.payment_doc_id)}:${String(b.item_id)}`;

/** Give a booking's units back to the pod's stock. Idempotent through the holder key. */
async function returnStock(b: Pick<IRentalBooking, 'pod_id' | 'item_id' | 'payment_doc_id' | 'quantity'>) {
  await RentalStockModel.updateOne(
    { pod_id: b.pod_id, item_id: b.item_id, holders: holderOf(b) },
    { $inc: { booked: -b.quantity }, $pull: { holders: holderOf(b) } }
  );
}

/** Close one BOOKED booking with an outcome, freezing the money it owes. Null when it was already closed. */
async function close(
  booking: IRentalBooking,
  outcome: RentalOutcome,
  extra: { claim?: number; note?: string; actorId?: string | null; auto?: boolean }
): Promise<IRentalBooking | null> {
  const settings = await rentalSettingsService.get();
  const money = settleRentalOutcome(booking, outcome, settings, extra.claim ?? 0);
  const actorRole = extra.actorId ? 'VENUE' : 'SYSTEM';
  return RentalBookingModel.findOneAndUpdate(
    { _id: booking._id, status: 'BOOKED' },
    {
      $set: {
        status: outcome,
        damage_claim: money.damage_claim,
        damage_note: (extra.note ?? '').trim().slice(0, NOTE_MAX),
        refund_due: money.refund_due,
        refund_status: money.refund_due > 0 ? 'DUE' : 'NONE',
        deposit_at_venue: money.deposit_at_venue,
        commission_pct: settings.commission_pct,
        commission_amount: money.commission_amount,
        venue_amount: money.venue_amount,
        marked_by: extra.actorId ? new Types.ObjectId(extra.actorId) : null,
        marked_at: new Date(),
        auto_released: extra.auto === true,
        deposit_policy: 'DUNCIT_REFUND',
      },
      $push: rentalEventPush({
        type: extra.auto && outcome !== 'RELEASED' ? 'AUTO_RELEASED' : outcome,
        actor_role: actorRole,
        actor_id: extra.actorId,
        amount: money.refund_due,
        detail: (extra.note ?? '').trim() || `Refund due ${money.refund_due}, venue earns ${money.venue_amount}`,
      }),
    },
    { new: true }
  ).lean<IRentalBooking>();
}

/** Queue a closed booking's refund on Razorpay. Never throws: the refund sweep retries whatever did not queue. */
async function queueRefundSafely(booking: IRentalBooking) {
  if (!(booking.refund_due > 0)) return;
  await queueRentalRefund(booking._id).catch((error: unknown) =>
    logs.server.error('rentalBooking', 'queueRefund', { error, booking_id: String(booking._id), msg: 'left for the refund sweep' })
  );
}

/** An item that went out was closed: its deposit refund goes to Razorpay and the guest hears the decision. */
async function afterReturn(booking: IRentalBooking) {
  await queueRefundSafely(booking);
  await notifyRentalReturned(booking);
}

/** The venue (or a venues-console editor) records the item back, or keeps part of the deposit for damage. */
async function markByVenue(
  actor: { userId: string; isAdmin: boolean },
  bookingId: string,
  input: { outcome: 'RETURNED' | 'DAMAGED'; damage_claim?: number | null; note?: string | null }
) {
  if (!Types.ObjectId.isValid(bookingId)) fail('BAD_USER_INPUT', 'That rental could not be found');
  const booking = await RentalBookingModel.findById(bookingId).lean<IRentalBooking>();
  if (!booking) return fail('NOT_FOUND', 'That rental could not be found');
  await managedVenue(actor.userId, actor.isAdmin, String(booking.venue_id));
  if (booking.status !== 'BOOKED') fail('CONFLICT', 'This rental is already closed');
  const pod = await PodModel.findById(booking.pod_id).setOptions({ includeDeleted: true }).select('pod_date_time').lean();
  if (pod?.pod_date_time && new Date(pod.pod_date_time).getTime() > Date.now()) {
    fail('BAD_REQUEST', 'Items can be marked once the pod has started');
  }
  const claim = Number(input.damage_claim ?? 0);
  if (input.outcome === 'DAMAGED') {
    if (!Number.isFinite(claim) || claim <= 0) fail('BAD_USER_INPUT', 'Enter the damage amount to keep from the deposit');
    if (claim > booking.deposit_amount) fail('BAD_USER_INPUT', 'A damage claim cannot be more than the deposit');
    if (!(input.note ?? '').trim()) fail('BAD_USER_INPUT', 'Say what was damaged');
  }
  const closed = await close(booking, input.outcome, { claim, note: input.note ?? '', actorId: actor.userId });
  if (!closed) return fail('CONFLICT', 'This rental is already closed');
  await afterReturn(closed);
  logs.server.info('rentalBooking', 'markByVenue', {
    booking_id: bookingId,
    actor_user_id: actor.userId,
    outcome: input.outcome,
    damage_claim: closed.damage_claim,
    refund_due: closed.refund_due,
    deposit_at_venue: closed.deposit_at_venue,
    venue_amount: closed.venue_amount,
  });
  return closed;
}

/** A Backout whose spot was filled ended the guest's booking: their rentals go back to the pod. */
async function releaseForPayment(paymentDocId: unknown): Promise<number> {
  const open = await RentalBookingModel.find({ payment_doc_id: paymentDocId, status: 'BOOKED' }).lean<IRentalBooking[]>();
  const released: IRentalBooking[] = [];
  for (const booking of open) {
    const closed = await close(booking, 'RELEASED', { auto: true });
    if (!closed) continue;
    await returnStock(closed);
    await queueRefundSafely(closed);
    released.push(closed);
  }
  await notifyRentalsEnded(released, 'GUEST_LEFT');
  return released.length;
}

/**
 * After a payment's capture committed: a line that sold out between checkout
 * and capture has its refund queued on Razorpay, and the venue and the guest
 * hear what was booked. Run from the payment's deferred side effects, so a
 * retried run re-queues nothing (idempotent keys) and messages nobody twice.
 */
async function afterCapture(paymentDocId: unknown): Promise<void> {
  const soldOut = await RentalBookingModel.find({ payment_doc_id: paymentDocId, status: 'UNAVAILABLE' }).lean<IRentalBooking[]>();
  for (const booking of soldOut) await queueRefundSafely(booking);
  await notifyRentalsBooked(String(paymentDocId));
}

/** The rental money a pod cancellation must return with this payment: every item still out. */
async function cancellableMoney(paymentDocId: unknown): Promise<number> {
  const open = await RentalBookingModel.find({ payment_doc_id: paymentDocId, status: 'BOOKED' })
    .select('rent_amount deposit_amount')
    .lean();
  return open.reduce((sum, b) => sum + b.rent_amount + b.deposit_amount, 0);
}

/** The payment's cancellation refund now carries these rentals' money. Stock stays held: a revoke restores them. */
async function cancelForPayment(paymentDocId: unknown): Promise<void> {
  const open = await RentalBookingModel.find({ payment_doc_id: paymentDocId, status: 'BOOKED' }).lean<IRentalBooking[]>();
  const cancelled: IRentalBooking[] = [];
  for (const b of open) {
    const owed = b.rent_amount + b.deposit_amount;
    const done = await RentalBookingModel.findOneAndUpdate(
      { _id: b._id, status: 'BOOKED' },
      {
        $set: { status: 'CANCELLED', refund_due: owed, refund_status: 'IN_PAYMENT', marked_at: new Date() },
        $push: rentalEventPush({
          type: 'CANCELLED',
          actor_role: 'SYSTEM',
          amount: owed,
          detail: 'Pod cancelled: the money returns with the booking cancellation refund',
        }),
      },
      { new: true }
    ).lean<IRentalBooking>();
    if (done) cancelled.push(done);
  }
  await notifyRentalsEnded(cancelled, 'POD_CANCELLED');
}

/**
 * A revoked cancellation puts the pod back on, and with it the rentals whose
 * refund was only HELD. A refund already paid out stays paid, so its rentals
 * stay cancelled: restoring them would pay the venue rent the guest got back.
 */
async function restoreForPayments(paymentDocIds: readonly unknown[]): Promise<number> {
  if (paymentDocIds.length === 0) return 0;
  const result = await RentalBookingModel.updateMany(
    { payment_doc_id: { $in: paymentDocIds }, status: 'CANCELLED', refund_status: 'IN_PAYMENT' },
    {
      $set: { status: 'BOOKED', refund_due: 0, refund_status: 'NONE', marked_at: null },
      $push: rentalEventPush({ type: 'RESTORED', actor_role: 'SYSTEM', detail: 'Pod cancellation revoked before the refund was paid' }),
    }
  );
  return result.modifiedCount ?? 0;
}

/**
 * Close every rental the venue never marked once its pod ended long enough
 * ago, as if the item came back in good shape: the venue had that long to
 * report damage, so the deposit is refunded to the guest through Razorpay and
 * the rent rides the venue's payout. Returns how many it closed.
 */
async function runDepositAutoRelease(now = Date.now()): Promise<number> {
  const settings = await rentalSettingsService.get();
  const podIds = await RentalBookingModel.distinct('pod_id', { status: 'BOOKED' });
  if (podIds.length === 0) return 0;
  const pods = await PodModel.find({ _id: { $in: podIds } })
    .setOptions({ includeDeleted: true })
    .select('pod_date_time pod_end_date_time')
    .lean();
  const cutoff = now - settings.deposit_auto_release_days * DAY_MS;
  const due = pods.filter((pod) => (podLiveEnd(pod)?.getTime() ?? Number.POSITIVE_INFINITY) <= cutoff).map((p) => p._id);
  let closed = 0;
  for (const podId of due) {
    const open = await RentalBookingModel.find({ pod_id: podId, status: 'BOOKED' }).lean<IRentalBooking[]>();
    for (const booking of open) {
      const done = await close(booking, 'RETURNED', { auto: true });
      if (!done) continue;
      closed += 1;
      await afterReturn(done);
    }
  }
  if (closed > 0) logs.server.info('rentalBooking', 'runDepositAutoRelease', { closed });
  return closed;
}

/**
 * Retired 2026-11-22. A typed reference used to mark a rental refund paid with
 * nothing proving money moved. Refunds now go out through Razorpay and read
 * paid only when Razorpay confirms them; the mutation stays in the schema
 * (deprecated) for old clients and always refuses.
 */
async function markRefunded(actorId: string, bookingId: string): Promise<never> {
  logs.server.warn('rentalBooking', 'markRefunded', { booking_id: bookingId, actor_user_id: actorId, msg: 'retired mutation refused' });
  return fail(
    'BAD_REQUEST',
    'Rental refunds are sent through Razorpay automatically and cannot be marked paid by hand. Open the rental to see its Razorpay refund.'
  );
}

export const rentalLifecycleService = {
  markByVenue,
  releaseForPayment,
  afterCapture,
  cancellableMoney,
  cancelForPayment,
  restoreForPayments,
  runDepositAutoRelease,
  markRefunded,
};
