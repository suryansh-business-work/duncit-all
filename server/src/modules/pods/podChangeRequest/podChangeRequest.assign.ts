import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { ClubModel } from '@modules/clubs/club/club.model';
import { clubService } from '@modules/clubs/club/club.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { holdWindow } from '@modules/venues/venueOffer/venueOffer.hold';
import { checkAndPrice, venueOfferService } from '@modules/venues/venueOffer/venueOffer.service';
import type { VenueOfferModel, VenueOfferRequest } from '@modules/venues/venueOffer/venueOffer.types';
import { breakdownService } from '@modules/finance/finance/breakdown.service';
import { assertActiveHost, resolveVenueLocation } from '@modules/pods/pod/pod.service';
import { podAuditService } from '@modules/pods/podAudit/podAudit.service';
import { changeRequestFail } from './podChangeRequest.common';
import { notifyPodRescheduled } from '@modules/pods/pod/pod.rescheduleNotify';
import { notifyAttendeesOfVenueChange } from './podChangeRequest.notify';
import type { IPodChangeOffer, IPodChangeRequest } from './podChangeRequest.model';
import { appDateTime } from '@utils/app-time';

/**
 * The write that actually swaps a partner out of a pod, once the replacement
 * has said yes.
 *
 * `podService.update` can already re-route a venue, re-point a host array and
 * move a club, and this deliberately does NOT go through it — for one reason.
 * An admin re-route through `updatePod` puts a partner venue back into
 * `venue_approval_status: 'PENDING'` and takes the pod OFFLINE until that venue
 * answers. Here the venue IS the one answering: the approval already happened,
 * in their own studio, on this very request. Sending them a second approval
 * queue for a slot they just accepted would take a selling pod off sale for no
 * reason. So the booking is written APPROVED, the way `venueApprovalForCreate`
 * writes an Auto Pod's venue.
 *
 * Everything else is the sanctioned primitive: `venueSlotService.bookForPod` /
 * `releaseSlotForPod` for the slot, `resolveVenueLocation` for the place,
 * `clubService.syncClubAdminRoles` for the CLUB_ADMIN role, and one
 * `podAuditService.record` per swap.
 */

/** A VENUE replacement answers with its own window and price terms (the guests are the pod's spots). */
export interface PodChangeVenueWindow {
  start_at: string;
  end_at: string;
  space_label?: string | null;
  model: VenueOfferModel;
  rate: number;
}

/** Venues take a change request with a time and a price now; an app that does not send one is told to update. */
export const UPDATE_APP_FOR_VENUE_CHANGE = 'Venues take over a pod with a time and a price now. Please update the app to accept it.';

/** The window + terms a venue answered with, as an offer request for this pod. */
export function venueWindowRequest(pod: { no_of_spots?: number | null }, window: PodChangeVenueWindow): VenueOfferRequest {
  return { ...window, pax: pod.no_of_spots ?? 0, pets: false };
}

/** What the caller is told so it can word the request's timeline. */
export interface ReplacementOutcome {
  summary: string;
  /** VENUE swaps move the pod's window; the requester and the guests are told. */
  moved_to: string;
}

/**
 * CLAIM THEN RELEASE — never the reverse.
 *
 * The venue's window is booked first, at the price it answered with (priced
 * with its charges and Duncit's commission on top, frozen now — this pod
 * settles on it); only once it is secured is the old booking let go. Invert it
 * and a lost race leaves the pod holding nothing while its old seat is already
 * back on sale. On a failed claim nothing has changed yet, so there is no state
 * to restore — the pod still holds its original booking.
 */
async function replaceVenue(
  request: IPodChangeRequest,
  pod: any,
  offer: IPodChangeOffer,
  window: PodChangeVenueWindow | null
): Promise<ReplacementOutcome> {
  const venueId = offer.venue_id ? String(offer.venue_id) : '';
  if (!venueId) changeRequestFail('BAD_REQUEST', 'This offer carries no venue');
  if (!window) changeRequestFail('BAD_USER_INPUT', UPDATE_APP_FOR_VENUE_CHANGE);

  const venue = await VenueModel.findById(venueId).select('venue_name owner_user_id');
  if (!venue) changeRequestFail('NOT_FOUND', 'Venue not found');
  if (String(venue!.owner_user_id) !== String(offer.user_id)) {
    changeRequestFail('FORBIDDEN', 'This venue is no longer yours');
  }

  const podId = String(pod._id);
  const req = venueWindowRequest(pod, window);
  // The pod's ticket money must still cover the venue at these terms — the
  // same rule every new booking faces. Priced again inside the lock below.
  const preview = await venueOfferService.prepare(venueId, req, podId);
  await breakdownService.assertViablePodEconomics({
    hostUserId: pod.pod_hosts_id?.[0] ? String(pod.pod_hosts_id[0]) : null,
    podAmount: pod.pod_amount ?? 0,
    noOfSpots: pod.no_of_spots ?? 0,
    venueId,
    venueAmount: preview.quote.total,
  });

  const previousSlotId = pod.venue_slot_id ? String(pod.venue_slot_id) : null;
  const slot = await holdWindow({
    venueId,
    req,
    holder: { field: 'booked_by_pod_id', id: podId },
    status: 'BOOKED',
    offerStatus: 'ACCEPTED',
    proposedBy: 'VENUE',
    agreed: true,
    closedBy: 'VENUE',
    priceInLock: (lockedVenue, session) => checkAndPrice(lockedVenue, venueId, req, { session, ignore: podId }),
  });
  const slotId = String(slot._id);
  offer.venue_slot_id = slot._id as Types.ObjectId;

  const before = { ...pod.toObject?.() };
  const place = await resolveVenueLocation({
    venue_id: venueId,
    location_id: null,
    club_id: String(pod.club_id),
    zone_name: null,
    venue_slot_id: slotId,
  });

  pod.venue_id = place.venue_id;
  pod.location_id = place.location_id;
  pod.zone_name = place.zone_name;
  pod.venue_slot_id = slot._id;
  pod.pod_date_time = slot.start_at;
  pod.pod_end_date_time = slot.end_at ?? null;
  // The venue accepted this pod itself, in its own studio. That acceptance IS
  // the approval — see the module comment.
  pod.venue_approval_status = 'APPROVED';
  pod.is_active = true;
  await pod.save();

  if (previousSlotId && previousSlotId !== slotId) {
    await venueSlotService.releaseSlotForPod(previousSlotId, String(pod._id));
  }

  const when = appDateTime(slot.start_at);
  await podAuditService.record({
    pod,
    action: 'UPDATE',
    source: 'ADMIN',
    actorUserId: String(offer.user_id),
    before,
    note: `Change request ${request.change_request_no}: venue moved to ${venue!.venue_name} (${when})`,
  });
  await notifyAttendeesOfVenueChange(pod, venue!.venue_name ?? '', when);
  // The in-app row above reaches only someone with the app open; a guest who
  // is not looking would still turn up at the old venue.
  await notifyPodRescheduled(pod, { inApp: false });

  return {
    summary: `${venue!.venue_name} took the pod on ${when}.`,
    moved_to: `${venue!.venue_name} · ${when}`,
  };
}

/**
 * The requester steps out of `pod_hosts_id` and the replacement steps in, in
 * the same position — so the pod's OWNER (index 0, by repo convention) stays
 * the owner rather than silently becoming a co-listed host.
 *
 * Co-hosts are untouched: they live in `co_hosts` and are view-only.
 */
async function replaceHost(
  request: IPodChangeRequest,
  pod: any,
  offer: IPodChangeOffer
): Promise<ReplacementOutcome> {
  const newHostId = String(offer.user_id);
  await assertActiveHost(newHostId);

  const current = (pod.pod_hosts_id ?? []).map(String);
  if (current.includes(newHostId)) {
    changeRequestFail('BAD_REQUEST', 'That host already runs this pod');
  }
  const index = current.indexOf(String(request.requested_by));
  const before = { ...pod.toObject?.() };
  const next = [...current];
  if (index === -1) next.push(newHostId);
  else next[index] = newHostId;
  pod.pod_hosts_id = next.map((id) => new Types.ObjectId(id)) as any;
  await pod.save();

  await podAuditService.record({
    pod,
    action: 'UPDATE',
    source: 'ADMIN',
    actorUserId: newHostId,
    before,
    note: `Change request ${request.change_request_no}: host handed over to ${offer.display_name || newHostId}`,
  });

  return {
    summary: `${offer.display_name || 'A new host'} took over the pod.`,
    moved_to: offer.display_name ?? '',
  };
}

/**
 * A club admin is a membership of the CLUB, not a field on the pod — so this
 * swaps who administers the pod's club, which is what "assign a different club
 * admin" means in this product. The pod itself is not moved to another club:
 * a club carries the pod's category, its slug namespace and its followers, and
 * re-pointing `club_id` would change the pod's public address and its category
 * as a side effect of a staffing change.
 *
 * `clubService.syncClubAdminRoles` is what keeps the CLUB_ADMIN user role in
 * step: it grants it to the newcomer and revokes it from the person leaving
 * ONLY if they administer no other club.
 */
async function replaceClubAdmin(
  request: IPodChangeRequest,
  pod: any,
  offer: IPodChangeOffer
): Promise<ReplacementOutcome> {
  const clubId = String(request.from_club_id ?? pod.club_id ?? '');
  if (!clubId || !Types.ObjectId.isValid(clubId)) {
    changeRequestFail('BAD_REQUEST', 'This pod has no club');
  }
  const club = await ClubModel.findById(clubId);
  if (!club) changeRequestFail('NOT_FOUND', 'Club not found');

  const newAdminId = String(offer.user_id);
  const previous = (club!.admin_user_ids ?? []).map(String);
  const next = previous.filter((id) => id !== String(request.requested_by));
  if (!next.includes(newAdminId)) next.push(newAdminId);
  club!.admin_user_ids = next.map((id) => new Types.ObjectId(id)) as any;
  await club!.save();
  await clubService.syncClubAdminRoles(previous, next);

  await podAuditService.record({
    pod,
    action: 'UPDATE',
    source: 'ADMIN',
    actorUserId: newAdminId,
    note: `Change request ${request.change_request_no}: ${club!.club_name} handed to ${offer.display_name || newAdminId}`,
  });

  return {
    summary: `${offer.display_name || 'A new club admin'} now administers ${club!.club_name}.`,
    moved_to: club!.club_name ?? '',
  };
}

/** Dispatch. One entry point, so no caller decides for itself what a role means. */
export async function applyReplacement(
  request: IPodChangeRequest,
  pod: any,
  offer: IPodChangeOffer,
  venueWindow: PodChangeVenueWindow | null = null
): Promise<ReplacementOutcome> {
  if (request.role === 'VENUE') return replaceVenue(request, pod, offer, venueWindow);
  if (request.role === 'HOST') return replaceHost(request, pod, offer);
  return replaceClubAdmin(request, pod, offer);
}

/** Best-effort: a slot booking that fails AFTER the pod moved must be loud. */
export function logAssignFailure(request: IPodChangeRequest, error: unknown) {
  logs.server.error('podChangeRequest', 'applyReplacement', {
    error,
    request_id: String(request._id),
    change_request_no: request.change_request_no,
    role: request.role,
  });
}
