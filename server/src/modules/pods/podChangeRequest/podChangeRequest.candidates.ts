import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import {
  audienceClubs,
  audienceHosts,
  audienceVenues,
} from '@modules/pods/autoPod/autoPod.audience';
import { changeRequestFail, contactOr, contactsFor } from './podChangeRequest.common';
import type { PodChangeRole } from './podChangeRequest.model';

/**
 * WHO an admin may offer a pod's place to.
 *
 * The matching itself is NOT re-implemented here: `audienceVenues`,
 * `audienceHosts` and `audienceClubs` in autoPod.audience.ts are already the one
 * place "who can take a pod of this sub-category, in this city" is written, and
 * a second copy is exactly how the drawer and the Auto Pod rollout would come
 * to disagree (rule 40). This module adds the two things a change request needs
 * that an Auto Pod rollout does not: full contact details for every candidate,
 * and — for a venue — the free slots it could give.
 *
 * A pod carries neither a category nor a city of its own: the sub-category comes
 * from its club (`Club.category_id`) and the city from `location_id`, falling
 * back to the venue's. That hop lives here so no caller has to know it.
 */

/** One person an admin can offer the place to, with everything to reach them. */
export interface ChangeCandidate {
  /** Stable row id: the user for a host/club admin, the VENUE for a venue. */
  id: string;
  user_id: string;
  /** What the row is called — the venue's name, or the person's. */
  label: string;
  /** The secondary line: the venue's locality, or the clubs a person runs. */
  detail: string;
  full_name: string;
  email: string;
  phone: string;
  /** VENUE rows only. */
  venue_id: string | null;
  /** CLUB_ADMIN rows only — the club this person would be brought into. */
  club_id: string | null;
  club_name: string;
}

/** A free slot at a candidate venue, as the drawer's picker lists it. */
export interface CandidateSlot {
  id: string;
  venue_id: string;
  start_at: string;
  end_at: string | null;
  price: number;
  capacity: number;
  space_label: string;
}

/** The pod's own matching keys — its club's sub-category and its city. */
export async function podMatchKeys(
  pod: any
): Promise<{ subCategoryId: Types.ObjectId | null; locationId: Types.ObjectId | null }> {
  const club = pod.club_id
    ? await ClubModel.findById(pod.club_id).select('category_id location_id').lean()
    : null;
  let locationId: Types.ObjectId | null = pod.location_id ?? null;
  if (!locationId && pod.venue_id) {
    const venue = await VenueModel.findById(pod.venue_id).select('location_id').lean();
    locationId = (venue as any)?.location_id ?? null;
  }
  return {
    subCategoryId: ((club as any)?.category_id as Types.ObjectId) ?? null,
    locationId,
  };
}

/** `audience*` takes the pinned-location shape Auto Pods uses; this is the
 * smallest object that satisfies it, so the same matcher serves both. */
const asPin = (locationId: Types.ObjectId | null) =>
  locationId
    ? ({ location_id: locationId } as any)
    : null;

async function venueCandidates(
  subCategoryId: Types.ObjectId,
  locationId: Types.ObjectId | null,
  excludeVenueId: string | null
): Promise<ChangeCandidate[]> {
  const venues = await audienceVenues(subCategoryId, asPin(locationId));
  const kept = venues.filter((v) => v.id !== excludeVenueId);
  const contacts = await contactsFor(kept.map((v) => v.owner_user_id));
  return kept.map((v) => {
    const contact = contactOr(contacts, v.owner_user_id);
    return {
      id: v.id,
      user_id: v.owner_user_id,
      label: v.venue_name,
      detail: [v.locality, v.city].filter(Boolean).join(', '),
      full_name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      venue_id: v.id,
      club_id: null,
      club_name: '',
    };
  });
}

/**
 * Hosts match on sub-category ALONE — deliberately.
 *
 * A Host record carries the categories they are approved into and no city of
 * their own (autoPod.audience.ts says so in as many words: a host picks the city
 * when they enrol). Filtering them by the pod's city would therefore return
 * nobody at all rather than a shorter list, so the drawer says out loud that
 * hosts are matched by category and the admin reads the phone number.
 */
async function hostCandidates(
  subCategoryId: Types.ObjectId,
  excludeUserIds: readonly string[]
): Promise<ChangeCandidate[]> {
  const hosts = await audienceHosts(subCategoryId);
  const excluded = new Set(excludeUserIds.map(String));
  const kept = hosts.filter((h) => !excluded.has(h.user_id));
  const contacts = await contactsFor(kept.map((h) => h.user_id));
  return kept.map((h) => {
    const contact = contactOr(contacts, h.user_id);
    return {
      id: h.user_id,
      user_id: h.user_id,
      // The Host record is the onboarded identity, so its name and number win
      // over the account's when both exist.
      label: h.full_name || contact.full_name,
      detail: h.phone || contact.phone,
      full_name: h.full_name || contact.full_name,
      email: h.email || contact.email,
      phone: h.phone || contact.phone,
      venue_id: null,
      club_id: null,
      club_name: '',
    };
  });
}

/**
 * Club admins match on the pod's sub-category and city, and each row is a
 * PERSON PLUS THE CLUB they already administer.
 *
 * A club admin is a membership of `Club.admin_user_ids`, not a pod field, so
 * "assign a different club admin" means swapping who administers THIS POD'S
 * club — the row's `club_id` is therefore only shown for context (which clubs
 * this person already runs) and is never what the pod is moved to.
 */
async function clubAdminCandidates(
  subCategoryId: Types.ObjectId,
  locationId: Types.ObjectId | null,
  excludeUserIds: readonly string[]
): Promise<ChangeCandidate[]> {
  const clubs = await audienceClubs(subCategoryId, asPin(locationId));
  const excluded = new Set(excludeUserIds.map(String));
  const byUser = new Map<string, { clubs: string[] }>();
  for (const club of clubs) {
    for (const userId of club.admin_user_ids) {
      if (excluded.has(userId)) continue;
      const row = byUser.get(userId) ?? { clubs: [] };
      row.clubs.push(club.club_name);
      byUser.set(userId, row);
    }
  }
  const userIds = [...byUser.keys()];
  const contacts = await contactsFor(userIds);
  return userIds.map((userId) => {
    const contact = contactOr(contacts, userId);
    const clubNames = byUser.get(userId)?.clubs ?? [];
    return {
      id: userId,
      user_id: userId,
      label: contact.full_name || contact.email,
      detail: clubNames.join(', '),
      full_name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      venue_id: null,
      club_id: null,
      club_name: clubNames[0] ?? '',
    };
  });
}

/**
 * The drawer's list for one request.
 *
 * `exclude` is who is already on the pod in that role — offering somebody their
 * own place back is the one row that can never be right.
 */
export async function candidatesForRequest(
  pod: any,
  role: PodChangeRole,
  exclude: Readonly<{ venueId: string | null; userIds: readonly string[] }>
): Promise<ChangeCandidate[]> {
  const { subCategoryId, locationId } = await podMatchKeys(pod);
  if (!subCategoryId) {
    changeRequestFail(
      'BAD_REQUEST',
      'This pod’s club has no category, so Duncit cannot match a replacement. Set the club’s category first.'
    );
  }
  if (role === 'VENUE') return venueCandidates(subCategoryId!, locationId, exclude.venueId);
  if (role === 'HOST') return hostCandidates(subCategoryId!, exclude.userIds);
  return clubAdminCandidates(subCategoryId!, locationId, exclude.userIds);
}

/**
 * Free slots at one candidate venue, from now on.
 *
 * Read straight off the collection rather than through
 * `venueSlotService.listAvailable`, which hydrates the venue and the booking pod
 * for the owner's own calendar; the drawer needs the times and the price and
 * nothing else. Leave dates are excluded the same way that service does it —
 * a slot created before a date was marked as leave is still on the collection.
 */
export async function slotsForVenue(venueId: string, limit = 200): Promise<CandidateSlot[]> {
  if (!Types.ObjectId.isValid(venueId)) changeRequestFail('BAD_USER_INPUT', 'Invalid venue_id');
  const venue = await VenueModel.findById(venueId).select('settings.holidays').lean();
  const holidays = new Set<string>((venue as any)?.settings?.holidays ?? []);
  const docs = await VenueSlotModel.find({
    venue_id: new Types.ObjectId(venueId),
    status: 'AVAILABLE',
    start_at: { $gte: new Date() },
  })
    .sort({ start_at: 1 })
    .limit(limit)
    .lean();
  return (docs as any[])
    .filter((s) => !holidays.has(new Date(s.start_at).toISOString().slice(0, 10)))
    .map((s) => ({
      id: String(s._id),
      venue_id: String(s.venue_id),
      start_at: new Date(s.start_at).toISOString(),
      end_at: s.end_at ? new Date(s.end_at).toISOString() : null,
      price: s.price ?? 0,
      capacity: s.capacity ?? 0,
      space_label: s.space_label ?? '',
    }));
}
