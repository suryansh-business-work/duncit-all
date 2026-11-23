import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { isUploadedPhotoUrl } from '@utils/url';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { razorpayPaymentIdOf } from '@modules/finance/payment/payment.gatewayIds';
import { PaymentGatewayRefundModel, type IPaymentGatewayRefund } from '@modules/finance/payment/payment.gatewayRefund.model';
import {
  RENTAL_PROOF_IMAGES_MAX,
  RENTAL_PROOF_NOTE_MAX,
  RENTAL_PROOFS_MAX,
  RentalBookingModel,
  rentalEventPush,
  type IRentalBooking,
  type IRentalEvent,
} from './rentalBooking.model';
import { hydrateRentalBookings } from './rentalBookingTable.service';
import { MANUAL_MARK_REASON } from './rentalRefundState';

/**
 * One rental, whole: who rented it for which pod, the venue to return it to,
 * the payment it rode on, every Razorpay refund that carries its money, the
 * optional proofs and the timeline. Two views of the same record:
 *  - FINANCE sees everything, including the guest's email and the Razorpay
 *    ids and errors it needs to reconcile;
 *  - VENUE (the owner, or a Venues console editor) sees its own rental: the
 *    guest's name and phone to arrange the return, never their email or the
 *    payment's gateway details.
 * Who may see which view is decided by the resolver, server-side.
 */

export type RentalViewer = 'FINANCE' | 'VENUE';

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);

interface StoredPhone {
  extension?: string | null;
  number?: string | null;
}
const phoneText = (phone: StoredPhone | null | undefined) =>
  phone?.number ? `${phone.extension ? `${phone.extension} ` : ''}${phone.number}`.trim() : null;

const fullName = (u: { profile?: { first_name?: string | null; last_name?: string | null } | null } | null | undefined) =>
  `${u?.profile?.first_name ?? ''} ${u?.profile?.last_name ?? ''}`.trim();

export async function loadRentalBooking(id: string): Promise<IRentalBooking> {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'That rental could not be found');
  const booking = await RentalBookingModel.findById(id).lean<IRentalBooking>();
  if (!booking) return fail('NOT_FOUND', 'That rental could not be found');
  return booking;
}

/** Every gateway refund that carries this booking's money: its own, or the pod cancellation's that returned it. */
async function refundsFor(booking: IRentalBooking): Promise<IPaymentGatewayRefund[]> {
  const or: Record<string, unknown>[] = [];
  if (booking.gateway_refund_id) or.push({ _id: booking.gateway_refund_id });
  if (booking.refund_status === 'IN_PAYMENT') or.push({ payment_doc_id: booking.payment_doc_id, source: 'POD_CANCELLATION' });
  if (or.length === 0) return [];
  return PaymentGatewayRefundModel.find({ $or: or }).sort({ created_at: 1 }).lean<IPaymentGatewayRefund[]>();
}

/**
 * A booking closed before the timeline existed still has a story: rebuilt from
 * its own fields, so Finance sees when it was booked, closed and (for a
 * hand-marked refund) that nothing proves the money moved.
 */
function legacyEvents(b: IRentalBooking): IRentalEvent[] {
  const events: IRentalEvent[] = [
    { type: 'BOOKED', at: b.created_at, actor_id: null, actor_role: 'SYSTEM', amount: b.rent_amount + b.deposit_amount, detail: '' },
  ];
  if (b.marked_at && b.status !== 'BOOKED') {
    events.push({
      type: b.auto_released && b.status === 'RETURNED' ? 'AUTO_RELEASED' : b.status,
      at: b.marked_at,
      actor_id: b.marked_by,
      actor_role: b.marked_by ? 'VENUE' : 'SYSTEM',
      amount: b.refund_due,
      detail: b.damage_note ?? '',
    });
  }
  if (b.refund_status === 'PAID' && !b.gateway_refund_id && b.refunded_at) {
    events.push({
      type: 'MANUAL_REFUND_MARK',
      at: b.refunded_at,
      actor_id: b.refunded_by,
      actor_role: 'FINANCE',
      amount: b.refund_due,
      detail: `Reference typed: "${b.refund_ref}". ${MANUAL_MARK_REASON}`,
    });
  }
  return events;
}

async function namesOf(ids: readonly (Types.ObjectId | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (unique.length === 0) return new Map<string, string>();
  const users = await UserModel.find({ _id: { $in: unique } }).select('profile.first_name profile.last_name').lean();
  return new Map(users.map((u) => [String(u._id), fullName(u)]));
}

function refundPub(r: IPaymentGatewayRefund, viewer: RentalViewer) {
  const finance = viewer === 'FINANCE';
  return {
    id: String(r._id),
    source: r.source,
    status: r.status,
    amount: r.amount_paise / 100,
    razorpay_refund_id: finance ? r.razorpay_refund_id || null : null,
    attempts: r.attempts ?? 0,
    last_error: finance ? (r.last_error ?? '') : '',
    requested_at: iso(r.requested_at),
    processed_at: iso(r.processed_at),
    created_at: iso(r.created_at) ?? new Date(0).toISOString(),
  };
}

export async function rentalBookingDetail(booking: IRentalBooking, viewer: RentalViewer) {
  const finance = viewer === 'FINANCE';
  const [[pub], guest, pod, venue, payment, refunds] = await Promise.all([
    hydrateRentalBookings([booking]),
    UserModel.findById(booking.user_id).select('profile.first_name profile.last_name auth.email auth.phone').lean(),
    PodModel.findById(booking.pod_id).setOptions({ includeDeleted: true }).select('pod_id pod_title club_id pod_date_time pod_end_date_time').lean(),
    VenueModel.findById(booking.venue_id)
      .select('venue_name owner_name owner_phone owner_email address_line1 address_line2 locality city postal_code')
      .lean(),
    finance ? PaymentModel.findById(booking.payment_doc_id).select('payment_id gateway gateway_ref metadata total status paid_at').lean() : null,
    refundsFor(booking),
  ]);
  const club = pod?.club_id ? await ClubModel.findById(pod.club_id).select('club_id').lean() : null;
  const events = booking.events?.length ? booking.events : legacyEvents(booking);
  const proofs = booking.proofs ?? [];
  const names = await namesOf([...events.map((e) => e.actor_id), ...proofs.map((p) => p.added_by)]);
  return {
    booking: pub,
    viewer,
    guest: {
      id: String(booking.user_id),
      name: fullName(guest) || pub.guest_name,
      phone: phoneText(guest?.auth?.phone as StoredPhone | undefined),
      email: finance ? (guest?.auth?.email ?? null) : null,
    },
    venue: {
      id: String(booking.venue_id),
      name: venue?.venue_name ?? '',
      contact_name: venue?.owner_name ?? '',
      phone: venue?.owner_phone || null,
      email: finance ? venue?.owner_email || null : null,
      address: [venue?.address_line1, venue?.address_line2, venue?.locality, venue?.city, venue?.postal_code].filter(Boolean).join(', '),
    },
    pod: pod
      ? {
          id: String(pod._id),
          public_id: String(pod.pod_id ?? ''),
          club_public_id: String((club as { club_id?: unknown } | null)?.club_id ?? ''),
          title: pod.pod_title ?? '',
          starts_at: iso(pod.pod_date_time),
          ends_at: iso(pod.pod_end_date_time),
        }
      : null,
    payment: payment
      ? {
          payment_doc_id: String(payment._id),
          payment_ref: payment.payment_id,
          gateway: payment.gateway ?? '',
          razorpay_payment_id: razorpayPaymentIdOf(payment) || null,
          total: payment.total,
          status: payment.status,
          paid_at: iso(payment.paid_at),
        }
      : null,
    refunds: refunds.map((r) => refundPub(r, viewer)),
    proofs: proofs.map((p) => ({
      note: p.note,
      image_urls: p.image_urls,
      added_by_name: (p.added_by && names.get(String(p.added_by))) || '',
      added_by_role: p.added_by_role,
      added_at: iso(p.added_at) ?? '',
    })),
    events: events.map((e) => ({
      type: e.type,
      at: iso(e.at) ?? '',
      actor_name: (e.actor_id && names.get(String(e.actor_id))) || '',
      actor_role: e.actor_role,
      amount: e.amount ?? null,
      detail: finance || e.actor_role !== 'RAZORPAY' ? e.detail : '',
    })),
  };
}

export interface RentalProofInput {
  note?: string | null;
  image_urls?: readonly string[] | null;
}

/** The same rules the forms check, enforced here for every caller (the console, the app, MCP). */
export function validateRentalProof(input: RentalProofInput): { note: string; image_urls: string[] } {
  const note = (input.note ?? '').trim();
  const images = [...new Set((input.image_urls ?? []).map((u) => String(u).trim()).filter(Boolean))];
  if (!note && images.length === 0) fail('BAD_USER_INPUT', 'Add a note or at least one photo');
  if (note.length > RENTAL_PROOF_NOTE_MAX) fail('BAD_USER_INPUT', `Keep the note under ${RENTAL_PROOF_NOTE_MAX} characters`);
  if (images.length > RENTAL_PROOF_IMAGES_MAX) fail('BAD_USER_INPUT', `Add at most ${RENTAL_PROOF_IMAGES_MAX} photos`);
  if (images.some((url) => !isUploadedPhotoUrl(url))) fail('BAD_USER_INPUT', 'Photos must be uploaded through Duncit');
  return { note, image_urls: images };
}

/**
 * Attach optional supporting evidence — what came back, the damage, a note on
 * the refund. Evidence only: it never changes the booking's money or status,
 * and a digitally paid refund's proof stays Razorpay's own record.
 */
export async function addRentalProof(actor: { userId: string; viewer: RentalViewer }, booking: IRentalBooking, input: RentalProofInput) {
  const proof = validateRentalProof(input);
  const role = actor.viewer === 'FINANCE' ? 'FINANCE' : 'VENUE';
  const updated = await RentalBookingModel.findOneAndUpdate(
    { _id: booking._id, [`proofs.${RENTAL_PROOFS_MAX - 1}`]: { $exists: false } },
    {
      $push: {
        proofs: { ...proof, added_by: new Types.ObjectId(actor.userId), added_by_role: role, added_at: new Date() },
        ...rentalEventPush({
          type: 'PROOF_ADDED',
          actor_role: role,
          actor_id: actor.userId,
          detail: `${proof.image_urls.length} photo(s)${proof.note ? ` · ${proof.note.slice(0, 120)}` : ''}`,
        }),
      },
    },
    { new: true }
  ).lean<IRentalBooking>();
  if (!updated) return fail('BAD_REQUEST', `A rental can hold at most ${RENTAL_PROOFS_MAX} proofs`);
  logs.server.info('rentalBooking', 'addProof', { booking_id: String(booking._id), actor_user_id: actor.userId, role, images: proof.image_urls.length });
  return updated;
}
