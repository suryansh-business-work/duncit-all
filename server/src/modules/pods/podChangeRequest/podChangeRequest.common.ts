import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { UserModel } from '@modules/access/user/user.model';
import { podSeatsTaken } from '@modules/pods/pod/pod.seats';
import type { IPodChangeOffer, IPodChangeRequest, PodChangeRole } from './podChangeRequest.model';

/** Same shape every other pods module throws. */
export function changeRequestFail(code: string, message: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

/**
 * The projection every outbound leg needs.
 *
 * `destinationFor` reads the WhatsApp number off two of these fields and
 * `notifyEvent` reads the address off a third, so a narrower one makes the
 * WhatsApp leg skip with "No WhatsApp number" and the email leg skip in
 * silence. Copied deliberately from venueSlot.service.ts, which learned it the
 * hard way.
 */
export const CONTACT_FIELDS =
  'profile.first_name profile.last_name auth.email auth.phone communication.whatsapp';

export const contactName = (user: any): string =>
  `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();

export const contactEmail = (user: any): string => String(user?.auth?.email ?? '');

/** `.lean()` drops the `phone_number` virtual, so the nested path is read. */
export const contactPhone = (user: any): string =>
  String(user?.communication?.whatsapp ?? user?.auth?.phone?.number ?? '');

/** Every WhatsApp template prints the date and the time as two placeholders. */
export const waWhen = (at: Date | null | undefined) => {
  if (!(at instanceof Date) || Number.isNaN(at.getTime())) return { date: '', time: '' };
  return {
    date: at.toLocaleString('en-IN', { dateStyle: 'medium' }),
    time: at.toLocaleString('en-IN', { timeStyle: 'short' }),
  };
};

/** A pod that can still take a change request. Cancelled and completed pods
 * cannot: there is nothing left to hand over. */
export async function loadLivePod(podDocId: string) {
  if (!Types.ObjectId.isValid(podDocId)) changeRequestFail('BAD_USER_INPUT', 'Invalid pod id');
  const pod = await PodModel.findById(podDocId);
  if (!pod) changeRequestFail('NOT_FOUND', 'Pod not found');
  if (pod!.completed_at) {
    changeRequestFail('BAD_REQUEST', 'This pod is already completed — nothing left to hand over');
  }
  return pod!;
}

/**
 * Is this person the one the pod carries in that role, right now?
 *
 * Deliberately three separate answers rather than one clever query: a host is a
 * membership of `pod_hosts_id`, a venue owner owns the venue the pod is booked
 * at, and a club admin is a membership of the pod's CLUB (there is no per-pod
 * club-admin field — the club owns that assignment).
 */
export async function assertRoleOnPod(pod: any, role: PodChangeRole, userId: string) {
  if (role === 'HOST') {
    const isHost = (pod.pod_hosts_id ?? []).some((id: any) => String(id) === userId);
    if (!isHost) changeRequestFail('FORBIDDEN', 'You do not host this pod');
    return;
  }
  if (role === 'VENUE') {
    // APPROVED only, exactly like `assertOwnedVenue` in pod.service.ts. A pod
    // still PENDING is one this venue has not agreed to yet — the answer there
    // is to decline the slot request, not to pay Account Health points asking
    // Duncit to move a booking that was never made. A DECLINED pod can still
    // carry `venue_id` (the decline clears the slot, not the pod's venue), so
    // without this check a venue could file against a pod it already refused.
    const venue =
      pod.venue_id && pod.venue_approval_status === 'APPROVED'
        ? await VenueModel.findOne({
            _id: pod.venue_id,
            owner_user_id: new Types.ObjectId(userId),
          }).select('_id')
        : null;
    if (!venue) changeRequestFail('FORBIDDEN', 'This pod is not booked at a venue you own');
    return;
  }
  const club = pod.club_id
    ? await ClubModel.findOne({
        _id: pod.club_id,
        admin_user_ids: new Types.ObjectId(userId),
      }).select('_id')
    : null;
  if (!club) changeRequestFail('FORBIDDEN', 'You do not administer this pod’s club');
}

/** Seats taken — attendees plus the extra seats they bought (never a length). */
export const podAttendeeCount = (pod: any): number => podSeatsTaken(pod);

/** One offer, shaped for GraphQL. Null in, null out. */
export function offerToPub(offer: IPodChangeOffer | null | undefined) {
  if (!offer) return null;
  return {
    user_id: String(offer.user_id),
    display_name: offer.display_name ?? '',
    venue_id: offer.venue_id ? String(offer.venue_id) : null,
    venue_slot_id: offer.venue_slot_id ? String(offer.venue_slot_id) : null,
    club_id: offer.club_id ? String(offer.club_id) : null,
    status: offer.status,
    offered_at: offer.offered_at?.toISOString?.() ?? '',
    responded_at: offer.responded_at?.toISOString?.() ?? null,
    pass_reason: offer.pass_reason ?? '',
  };
}

/** Contact card for one person, as every drawer and card renders it. */
export interface PartnerContact {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
}

export async function contactsFor(userIds: readonly string[]): Promise<Map<string, PartnerContact>> {
  const unique = [...new Set(userIds)].filter((id) => id && Types.ObjectId.isValid(id));
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({
    _id: { $in: unique.map((id) => new Types.ObjectId(id)) },
  })
    .select(CONTACT_FIELDS)
    .lean();
  return new Map(
    (users as any[]).map((u) => [
      String(u._id),
      {
        user_id: String(u._id),
        full_name: contactName(u),
        email: contactEmail(u),
        phone: contactPhone(u),
      },
    ])
  );
}

const EMPTY_CONTACT: PartnerContact = { user_id: '', full_name: '', email: '', phone: '' };

export const contactOr = (
  map: Map<string, PartnerContact>,
  userId: string | null | undefined
): PartnerContact => (userId ? map.get(String(userId)) ?? EMPTY_CONTACT : EMPTY_CONTACT);

/** Appends one immutable line to the request's timeline. */
export function appendEvent(
  doc: IPodChangeRequest,
  action: string,
  actorUserId: string | null,
  actorName: string,
  note = ''
) {
  doc.events.push({
    action,
    actor_user_id: actorUserId && Types.ObjectId.isValid(actorUserId)
      ? new Types.ObjectId(actorUserId)
      : null,
    actor_name: actorName,
    note: note.trim().slice(0, 500),
    at: new Date(),
  } as any);
}
