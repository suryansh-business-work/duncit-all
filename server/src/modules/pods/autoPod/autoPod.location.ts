import { Types } from 'mongoose';
import { LocationModel } from '@modules/platform/location/location.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { autoPodEvent, autoPodFail } from './autoPod.common';
import { AutoPodModel, type AutoPodLocationBinder, type IAutoPod, type IAutoPodLocation } from './autoPod.model';

/**
 * The FIRST enrolment pins an Auto Pod to one admin Location row (Country →
 * State → City). Every later enrolment must come from that same city: a venue
 * brings its own `location_id`, a club its own, and a host the city they had
 * selected on the Auto Pods page when they assigned themselves.
 */

/** Snapshot an admin Location row as the offer's pinned city. */
export async function snapshotAutoPodLocation(
  locationId: unknown,
  boundBy: AutoPodLocationBinder,
  missingMessage: string
): Promise<IAutoPodLocation> {
  const id = String(locationId ?? '');
  if (!Types.ObjectId.isValid(id)) autoPodFail('BAD_USER_INPUT', missingMessage);
  const loc: any = await LocationModel.findById(id)
    .select('location_name country state city is_active')
    .lean();
  if (!loc || loc.is_active === false) {
    autoPodFail('BAD_USER_INPUT', 'That location is not available');
  }
  return {
    location_id: loc._id,
    location_name: loc.location_name ?? '',
    country: loc.country ?? '',
    state: loc.state ?? '',
    city: loc.city ?? '',
    bound_by: boundBy,
    bound_at: new Date(),
  };
}

/** The filter clause that asserts an offer is pinned to exactly this city. */
export const matchGuard = (locationId: Types.ObjectId) => ({ 'location.location_id': locationId });

/**
 * What an enrolment does about the city: PIN it (the offer has none yet, so
 * this enrolment's city becomes the offer's) or MATCH it (the offer is pinned,
 * so this enrolment must come from the same city). The `guard` goes into the
 * claim's conditional write, which is what makes two first-enrolments from two
 * cities resolve to exactly one winner.
 */
export interface EnrolmentLocation {
  /** The snapshot to `$set` — null when the offer is already pinned. */
  pin: IAutoPodLocation | null;
  /** Filter clause the conditional claim must include. */
  guard: Record<string, unknown>;
}

export async function resolveEnrolmentLocation(
  doc: IAutoPod,
  locationId: unknown,
  boundBy: AutoPodLocationBinder,
  messages: { missing: string; mismatch: string }
): Promise<EnrolmentLocation> {
  if (doc.location) {
    // A venue or a club with no city of its own can never be IN the pinned
    // city; a host's selection is only consulted when they made one (the
    // pinned offer already knows where it is).
    if (!locationId && boundBy !== 'HOST') autoPodFail('BAD_USER_INPUT', messages.missing);
    if (locationId && String(locationId) !== String(doc.location.location_id)) {
      autoPodFail('BAD_USER_INPUT', messages.mismatch);
    }
    return { pin: null, guard: matchGuard(doc.location.location_id) };
  }
  const pin = await snapshotAutoPodLocation(locationId, boundBy, messages.missing);
  return { pin, guard: { location: null } };
}

/** "Bengaluru, Karnataka" — for messages and event notes. */
export function autoPodCityLabel(location: IAutoPodLocation | null | undefined): string {
  if (!location) return '';
  return [location.city || location.location_name, location.state].filter(Boolean).join(', ');
}

/**
 * Queue filter for one city. An offer nobody has enrolled in has no city yet
 * and is offered everywhere, so it always passes; a pinned offer passes only
 * for its own city. No city selected means no narrowing at all.
 */
export function locationScope(locationId?: string | null): Record<string, unknown> {
  if (!locationId || !Types.ObjectId.isValid(locationId)) return {};
  return {
    $or: [{ location: null }, { 'location.location_id': new Types.ObjectId(locationId) }],
  };
}

/**
 * Offers opened BY a club before pinning existed carry a `club_claim` and no
 * city, so the first venue or host from anywhere would pin them away from
 * their own club. Pin such an offer to its club's city on first contact
 * (conditionally, so two callers cannot both pin it). An offer whose club has
 * no location stays open to any city — there is nothing to pin it to.
 */
export async function ensureClubPin(doc: IAutoPod): Promise<IAutoPod> {
  if (doc.location || !doc.club_claim) return doc;
  const club: any = await ClubModel.findById(doc.club_claim.club_id).select('location_id').lean();
  if (!club?.location_id) return doc;
  const pin = await snapshotAutoPodLocation(
    club.location_id,
    'CLUB',
    'Set a location on this club before opening an Auto Pod'
  );
  const pinned = await AutoPodModel.findOneAndUpdate(
    { _id: doc._id, location: null },
    {
      $set: { location: pin },
      $push: {
        events: autoPodEvent('PIN', null, '', `Pinned to ${autoPodCityLabel(pin)} from its club`),
      },
    },
    { new: true }
  );
  return pinned ?? ((await AutoPodModel.findById(doc._id)) as IAutoPod);
}
