import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { appDateTime } from '@utils/app-time';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { getFinanceSettings, refundProcessingDaysOf } from '@modules/finance/finance/finance.model';
import { notifyEvent, type NotifyOutcome } from '@services/notify/notify.service';
import { alertStaff } from '@services/notify/staffAlert';
import { loadNotifyRecipients, recipientName, type NotifyUser } from '@services/notify/notify.recipients';
import { RentalBookingModel, rentalEventPush, type IRentalBooking } from './rentalBooking.model';

/**
 * The rental's own messages, email and WhatsApp together (`notifyEvent`), to
 * the right person each time:
 *  - the venue owner when items are booked for a pod and when they are called
 *    off (pod cancelled, guest left, sold out never reaches the venue);
 *  - the guest for their booking, a cancellation with what comes back, the
 *    venue's return/damage decision with the deposit refund, the refund
 *    Razorpay confirmed processed, and a refund that is delayed.
 * A refund is only ever called processed after Razorpay said so (it is sent
 * from the gateway sync). Every send is keyed on its business event, so a
 * retried sweep never messages twice; each outcome lands on the bookings'
 * timeline. Nothing here may fail the money movement that triggered it.
 */

const LOG = 'rentalNotify';

type Booking = Pick<
  IRentalBooking,
  '_id' | 'payment_doc_id' | 'payment_ref' | 'pod_id' | 'venue_id' | 'user_id' | 'name' | 'quantity' | 'rent_amount' | 'deposit_amount' | 'refund_due' | 'status' | 'damage_claim'
>;

interface RentalContext {
  podTitle: string;
  podWhen: string;
  venueName: string;
  owner: NotifyUser | null;
  ownerName: string;
  ownerEmail: string;
  guest: NotifyUser | null;
  guestName: string;
  money: (amount: number) => string;
  guestLink: string;
  venueLink: string;
  refundDays: string;
}

const trimBase = (url: string) => url.replace(/\/$/, '');
const round2 = (n: number) => Math.round(n * 100) / 100;

/** "UNO Cards × 1, Chess set × 2" */
export const rentalItemsText = (bookings: readonly Pick<IRentalBooking, 'name' | 'quantity'>[]) =>
  bookings.map((b) => `${b.name} × ${b.quantity}`).join(', ');

async function contextFor(first: Booking): Promise<RentalContext> {
  const [pod, venue, finance, urls] = await Promise.all([
    PodModel.findById(first.pod_id).setOptions({ includeDeleted: true }).select('pod_title pod_date_time').lean(),
    VenueModel.findById(first.venue_id).select('venue_name owner_user_id owner_name owner_email').lean(),
    getFinanceSettings(),
    getUrlConfigs(),
  ]);
  const people = await loadNotifyRecipients([first.user_id, venue?.owner_user_id]);
  const guest = people.get(String(first.user_id)) ?? null;
  const owner = venue?.owner_user_id ? (people.get(String(venue.owner_user_id)) ?? null) : null;
  return {
    podTitle: pod?.pod_title ?? 'your pod',
    podWhen: appDateTime(pod?.pod_date_time) || '',
    venueName: venue?.venue_name ?? '',
    owner,
    ownerName: venue?.owner_name || recipientName(owner),
    ownerEmail: venue?.owner_email || owner?.auth?.email || '',
    guest,
    guestName: recipientName(guest),
    money: (amount: number) => `${finance.currency_symbol}${round2(amount).toFixed(2)}`,
    guestLink: `${trimBase(urls.mwebUrl)}/rented-items`,
    venueLink: `${trimBase(urls.partnersUrl)}/venues/rented-items`,
    refundDays: String(refundProcessingDaysOf(finance)),
  };
}

/** Put what was sent on the bookings' timeline: who heard, on which channel. */
async function recordSent(bookings: readonly Booking[], event: string, outcome: NotifyOutcome | null) {
  if (!outcome) return;
  const mail = outcome.mail && outcome.mail.accepted.length > 0 ? 'email sent' : 'no email';
  await RentalBookingModel.updateMany(
    { _id: { $in: bookings.map((b) => b._id) } },
    { $push: rentalEventPush({ type: 'NOTIFIED', actor_role: 'SYSTEM', detail: `${event}: WhatsApp ${outcome.wa.status.toLowerCase()}, ${mail}` }) }
  );
}

async function send(bookings: readonly Booking[], run: () => Promise<{ event: string; outcome: NotifyOutcome | null }>) {
  try {
    const { event, outcome } = await run();
    await recordSent(bookings, event, outcome);
  } catch (error) {
    logs.server.warn(LOG, 'send', { error, booking_ids: bookings.map((b) => String(b._id)), msg: 'rental message not sent' });
  }
}

const toOwner = (ctx: RentalContext) => (ctx.owner || ctx.ownerEmail ? { user: ctx.owner, email: ctx.ownerEmail, name: ctx.ownerName } : null);

/** A captured pod payment booked rented items: the venue gets what to have ready, the guest a confirmation. Sold-out lines are told apart. */
export async function notifyRentalsBooked(paymentDocId: Types.ObjectId | string): Promise<void> {
  const all = await RentalBookingModel.find({ payment_doc_id: paymentDocId }).lean<IRentalBooking[]>();
  if (all.length === 0) return;
  const ctx = await contextFor(all[0]);
  const booked = all.filter((b) => b.status === 'BOOKED');
  const soldOut = all.filter((b) => b.status === 'UNAVAILABLE');
  const ref = all[0].payment_ref;
  if (booked.length > 0) {
    const items = rentalItemsText(booked);
    const paid = booked.reduce((sum, b) => sum + b.rent_amount + b.deposit_amount, 0);
    const owner = toOwner(ctx);
    if (owner) {
      await send(booked, async () => ({
        event: 'VENUE_RENTAL_BOOKED',
        outcome: await notifyEvent({
          event: 'VENUE_RENTAL_BOOKED',
          entityId: `rental_booked:${String(paymentDocId)}`,
          ...owner,
          buttonUrl: ctx.venueLink,
          params: [owner.name, items, ctx.podTitle, ctx.podWhen, ctx.guestName, ref, ctx.venueLink],
        }),
      }));
    }
    await send(booked, async () => ({
      event: 'USER_RENTAL_BOOKED',
      outcome: await notifyEvent({
        event: 'USER_RENTAL_BOOKED',
        entityId: `rental_booked:${String(paymentDocId)}`,
        user: ctx.guest,
        name: ctx.guestName,
        buttonUrl: ctx.guestLink,
        params: [ctx.guestName, items, ctx.podTitle, ctx.podWhen, ctx.venueName, ctx.money(paid), ctx.guestLink],
      }),
    }));
  }
  if (soldOut.length > 0) {
    await notifyGuestCancelled(soldOut, ctx, 'The item sold out before your payment went through', `rental_unavailable:${String(paymentDocId)}`);
  }
}

async function notifyGuestCancelled(bookings: readonly Booking[], ctx: RentalContext, reason: string, entityId: string) {
  const refund = bookings.reduce((sum, b) => sum + (b.refund_due || b.rent_amount + b.deposit_amount), 0);
  await send(bookings, async () => ({
    event: 'USER_RENTAL_CANCELLED',
    outcome: await notifyEvent({
      event: 'USER_RENTAL_CANCELLED',
      entityId,
      user: ctx.guest,
      name: ctx.guestName,
      buttonUrl: ctx.guestLink,
      params: [ctx.guestName, rentalItemsText(bookings), ctx.podTitle, reason, ctx.money(refund), ctx.guestLink],
    }),
  }));
}

export type RentalEndReason = 'POD_CANCELLED' | 'GUEST_LEFT';

const END_COPY: Record<RentalEndReason, { guest: string; venue: string }> = {
  POD_CANCELLED: { guest: 'The pod was cancelled', venue: 'The pod was cancelled' },
  GUEST_LEFT: { guest: 'You left the pod', venue: 'The guest left the pod' },
};

/** Items called off together (one payment): the guest hears what comes back, the venue not to hand them out. */
export async function notifyRentalsEnded(bookings: readonly Booking[], why: RentalEndReason): Promise<void> {
  if (bookings.length === 0) return;
  try {
    const ctx = await contextFor(bookings[0]);
    const entityId = `rental_${why.toLowerCase()}:${String(bookings[0].payment_doc_id)}`;
    await notifyGuestCancelled(bookings, ctx, END_COPY[why].guest, entityId);
    const owner = toOwner(ctx);
    if (!owner) return;
    await send(bookings, async () => ({
      event: 'VENUE_RENTAL_CANCELLED',
      outcome: await notifyEvent({
        event: 'VENUE_RENTAL_CANCELLED',
        entityId,
        ...owner,
        buttonUrl: ctx.venueLink,
        params: [owner.name, rentalItemsText(bookings), ctx.podTitle, ctx.podWhen, END_COPY[why].venue, ctx.venueLink],
      }),
    }));
  } catch (error) {
    logs.server.warn(LOG, 'notifyRentalsEnded', { error, why });
  }
}

/** The venue (or the sweep) closed an item that went out: the guest hears the decision and the deposit refund on its way. */
export async function notifyRentalReturned(booking: Booking): Promise<void> {
  try {
    const ctx = await contextFor(booking);
    const outcome =
      booking.status === 'DAMAGED'
        ? `Returned damaged — ${ctx.money(booking.damage_claim)} kept from the deposit`
        : 'Returned in good shape';
    await send([booking], async () => ({
      event: 'USER_RENTAL_RETURNED',
      outcome: await notifyEvent({
        event: 'USER_RENTAL_RETURNED',
        entityId: `rental_returned:${String(booking._id)}`,
        user: ctx.guest,
        name: ctx.guestName,
        buttonUrl: ctx.guestLink,
        params: [ctx.guestName, `${booking.name} × ${booking.quantity}`, ctx.podTitle, outcome, ctx.money(booking.refund_due), ctx.guestLink],
      }),
    }));
  } catch (error) {
    logs.server.warn(LOG, 'notifyRentalReturned', { error, booking_id: String(booking._id) });
  }
}

/** Razorpay confirmed the refund processed — the only moment a guest is told their money is back. */
export async function notifyRentalRefundProcessed(booking: Booking): Promise<void> {
  try {
    const ctx = await contextFor(booking);
    await send([booking], async () => ({
      event: 'USER_REFUND_PROCESSED',
      outcome: await notifyEvent({
        event: 'USER_REFUND_PROCESSED',
        entityId: `rental_refund:${String(booking._id)}`,
        user: ctx.guest,
        name: ctx.guestName,
        params: [ctx.guestName, ctx.money(booking.refund_due), `${booking.name} rented for ${ctx.podTitle}`, ctx.refundDays],
      }),
    }));
  } catch (error) {
    logs.server.warn(LOG, 'notifyRentalRefundProcessed', { error, booking_id: String(booking._id) });
  }
}

/** Razorpay would not take the refund after every retry: the guest hears it is delayed, Finance gets the alert to act. */
export async function notifyRentalRefundDelayed(booking: Booking, reason: string): Promise<void> {
  try {
    const ctx = await contextFor(booking);
    await send([booking], async () => ({
      event: 'USER_RENTAL_REFUND_DELAYED',
      outcome: await notifyEvent({
        event: 'USER_RENTAL_REFUND_DELAYED',
        entityId: `rental_refund_delayed:${String(booking._id)}`,
        user: ctx.guest,
        name: ctx.guestName,
        buttonUrl: ctx.guestLink,
        params: [ctx.guestName, ctx.money(booking.refund_due), `${booking.name} × ${booking.quantity}`, ctx.podTitle, ctx.guestLink],
      }),
    }));
    await alertStaff({
      desk: 'FINANCE',
      title: `Rental refund needs review — ${booking.payment_ref}`,
      lines: [
        `Item: ${booking.name} × ${booking.quantity} (booking ${String(booking._id)})`,
        `Pod: ${ctx.podTitle}`,
        `Amount: ${ctx.money(booking.refund_due)}`,
        `Why: ${reason}`,
        'Open Finance › Rented Items to send it again through Razorpay.',
      ],
    });
  } catch (error) {
    logs.server.warn(LOG, 'notifyRentalRefundDelayed', { error, booking_id: String(booking._id) });
  }
}
