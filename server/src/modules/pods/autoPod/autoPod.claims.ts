import { Types } from 'mongoose';
import { AutoPodModel, type IAutoPod, type IAutoPodLocation } from './autoPod.model';
import { autoPodService, autoPodToPub, spotLimits } from './autoPod.service';
import {
  AUTO_POD_COMPLETE_FILTER,
  autoPodEvent,
  autoPodFail,
  isAutoPodComplete,
  PRE_LIVE_FILTER,
  PRE_LIVE_STAGES,
} from './autoPod.common';
import {
  autoPodCityLabel,
  ensureClubPin,
  matchGuard,
  resolveEnrolmentLocation,
  type EnrolmentLocation,
} from './autoPod.location';
import { autoPodNotify } from './autoPod.notify';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService, ensureOwnedVenue } from '@modules/venues/venueSlot/venueSlot.service';
import {
  assertActiveHost,
  podService,
  validateFutureDates,
  validateMeetingDetails,
} from '@modules/pods/pod/pod.service';
import { breakdownService } from '@modules/finance/finance/breakdown.service';
import { clubAdminService } from '@modules/clubs/clubAdmin/clubAdmin.service';
import { logs } from '@observability/log';

async function displayName(userId: string): Promise<string> {
  const user: any = await UserModel.findById(userId)
    .select('profile.first_name profile.last_name')
    .lean();
  return (
    `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim() || 'A partner'
  );
}

/**
 * The three enrolments happen in ANY order, each racing others of its kind on
 * ONE conditional write: the filter asserts the offer is still pre-live, that
 * this role's claim is still empty, and — the location guard — either that the
 * offer is still unpinned (this enrolment pins it) or that it is pinned to this
 * enrolment's own city. The single write picks the winner; a loser gets
 * CONFLICT and, for a venue, releases the slot it booked.
 */
const isPreLive = (doc: IAutoPod) => PRE_LIVE_STAGES.includes(doc.stage as any);

/** The offer as every claim first sees it: loaded, pinned to its club's city
 * if it was opened by a club before pinning existed, and not paused — an
 * admin's pause is a hold on every claim, a re-tap included. */
const loadOffer = async (autoPodId: string) => {
  const doc = await ensureClubPin(await autoPodService.loadById(autoPodId));
  if (doc.is_active === false) {
    autoPodFail('CONFLICT', 'This Auto Pod is paused — try again once the admin resumes it');
  }
  return doc;
};

/** Every claim's `$set` moves the offer to CLAIMING and pins the city if it was
 * this enrolment's to pin. */
function claimSet(fields: Record<string, unknown>, location: EnrolmentLocation) {
  return { stage: 'CLAIMING', ...fields, ...(location.pin ? { location: location.pin } : {}) };
}

/** "Pinned to Bengaluru, Karnataka" — appended to the enrolment's event note. */
function pinNote(pin: IAutoPodLocation | null): string {
  return pin ? ` — pinned to ${autoPodCityLabel(pin)}` : '';
}

const mismatchMessage = (doc: IAutoPod, who: string) =>
  `This Auto Pod is in ${autoPodCityLabel(doc.location)} — ${who} must be in that city too`;

/**
 * Runs a claim's conditional write. A write that PINS can miss for two
 * reasons: someone else's claim landed (a real loss) or someone from the SAME
 * city pinned it a moment earlier (not a loss at all — the offer is now in
 * this caller's city). The second is told apart by re-reading the pin, and the
 * write is retried once as a MATCH.
 */
async function claimWrite(
  docId: Types.ObjectId,
  location: EnrolmentLocation,
  write: (location: EnrolmentLocation) => Promise<IAutoPod | null>
): Promise<IAutoPod | null> {
  const first = await write(location);
  if (first || !location.pin) return first;
  const fresh: any = await AutoPodModel.findById(docId).select('location').lean();
  const pinnedTo = fresh?.location?.location_id;
  if (!pinnedTo || String(pinnedTo) !== String(location.pin.location_id)) return null;
  return write({ pin: null, guard: matchGuard(pinnedTo) });
}

/**
 * A venue accepts an Auto Pod and commits one of its own slots — accept and
 * date/time/slot are ONE action, because an acceptance without a slot would
 * leave the offer half-claimed with nothing for a host to see.
 *
 * Ordering: the venue books its OWN slot first, then races every other venue on
 * the conditional claim. A loser — or any failure after the booking —
 * compensates by releasing the slot IT booked (keyed on both ids, so it can
 * never touch the winner's slot). Booking first also means the slot is
 * continuously BOOKED from acceptance until the pod goes live — no window in
 * which an ordinary pod could take it.
 */
export async function venueAcceptAutoPod(
  userId: string,
  autoPodId: string,
  venueId: string,
  slotId: string
) {
  const doc = await loadOffer(autoPodId);
  if (doc.pod_mode === 'VIRTUAL') {
    autoPodFail('BAD_REQUEST', 'A virtual Auto Pod has no venue — it needs only a host and a club');
  }
  if (!isPreLive(doc) || doc.venue_claim) {
    autoPodFail('CONFLICT', 'This Auto Pod has already been accepted by another venue.');
  }

  const venue = await ensureOwnedVenue(userId, venueId);
  if (venue.status !== 'APPROVED' || venue.is_active === false) {
    autoPodFail('FORBIDDEN', 'Only an approved, active venue can accept an Auto Pod');
  }
  // A venue declares the sub-category it hosts, and only a venue in the
  // offer's category is ever shown it — the same rule the queue applies.
  if (String(venue.venue_category?.sub_category_id ?? '') !== String(doc.sub_category_id)) {
    autoPodFail('BAD_USER_INPUT', "This Auto Pod's category does not match that venue");
  }
  // The venue's own city is what it brings — never a city picked on a screen.
  const location = await resolveEnrolmentLocation(doc, venue.location_id, 'VENUE', {
    missing: 'Set a location on this venue before accepting an Auto Pod',
    mismatch: mismatchMessage(doc, 'the venue'),
  });

  if (!Types.ObjectId.isValid(slotId)) autoPodFail('BAD_USER_INPUT', 'Invalid slot_id');
  const slot = await VenueSlotModel.findById(slotId);
  if (!slot) autoPodFail('NOT_FOUND', 'Selected slot not found');
  if (String(slot!.owner_user_id) !== userId || String(slot!.venue_id) !== String(venueId)) {
    autoPodFail('FORBIDDEN', 'That slot does not belong to this venue');
  }
  if (slot!.start_at.getTime() <= Date.now()) {
    autoPodFail('BAD_USER_INPUT', 'Pick a slot in the future');
  }

  // The venue learns HERE, before it commits, whether its price can be covered
  // — under the real host's rates when a host is already on it.
  await breakdownService.assertViablePodEconomics({
    hostUserId: doc.host_claim ? String(doc.host_claim.user_id) : null,
    podAmount: doc.pod_amount ?? 0,
    noOfSpots: doc.no_of_spots ?? 0,
    venueId: String(venueId),
    venueAmount: slot!.price ?? 0,
  });

  await venueSlotService.bookForAutoPod(slotId, venueId, userId, autoPodId);

  const write = (loc: EnrolmentLocation) =>
    AutoPodModel.findOneAndUpdate(
      { _id: doc._id, ...PRE_LIVE_FILTER, venue_claim: null, ...loc.guard },
      {
        $set: claimSet(
          {
            venue_claim: {
              venue_id: new Types.ObjectId(venueId),
              venue_slot_id: new Types.ObjectId(slotId),
              owner_user_id: new Types.ObjectId(userId),
              venue_name: venue.venue_name ?? '',
              pod_date_time: slot!.start_at,
              pod_end_date_time: slot!.end_at ?? null,
              slot_price: slot!.price ?? 0,
              accepted_at: new Date(),
            },
          },
          loc
        ),
        $push: {
          events: autoPodEvent(
            'VENUE_ENROLL',
            userId,
            venue.venue_name ?? '',
            `Venue accepted and picked a slot${pinNote(loc.pin)}`
          ),
        },
      },
      { new: true }
    );

  let claimed: IAutoPod | null = null;
  try {
    claimed = await claimWrite(doc._id as Types.ObjectId, location, write);
  } catch (err) {
    // Whatever failed, the slot this attempt booked must not stay held.
    await venueSlotService.releaseAutoPodSlot(slotId, autoPodId).catch((error) =>
      logs.server.error('autoPod', 'releaseAfterFailedAccept', { error, auto_pod_id: autoPodId })
    );
    throw err;
  }
  if (!claimed) {
    // Lost the race: give back only the slot this attempt booked.
    await venueSlotService.releaseAutoPodSlot(slotId, autoPodId);
    autoPodFail('CONFLICT', 'This Auto Pod has already been accepted by another venue.');
  }

  // The offer is theirs now, so it is not about to leave their list: their
  // "removed from your list" clock stops here and resumes only if they cancel.
  await autoPodService.setViewerClock(autoPodId, userId, false);
  autoPodNotify.enrolled(claimed, 'venue').catch((error) =>
    logs.server.error('autoPod', 'notifyVenueEnrolled', { error, auto_pod_id: autoPodId })
  );
  return finishIfComplete(claimed, userId);
}

/**
 * A host assigns themselves. `locationId` is the city the host had selected on
 * the Auto Pods page: it pins an unpinned offer, and must match a pinned one.
 */
/** What a host brings to a VIRTUAL offer: where members join, and when. */
export interface HostMeetingInput {
  meeting_platform?: string | null;
  meeting_url: string;
  meeting_notes?: string | null;
  pod_date_time: string;
  pod_end_date_time: string;
}

/**
 * The meeting fields the host's claim writes. A virtual offer has no venue to
 * fix its window, so the host's link and dates are required and checked with
 * the same rules an ordinary virtual pod is; a physical offer takes its dates
 * from the venue's slot and carries no meeting, whatever was sent.
 */
function hostMeetingFields(doc: IAutoPod, meeting?: HostMeetingInput | null) {
  if (doc.pod_mode !== 'VIRTUAL') return {};
  if (!meeting) {
    autoPodFail('BAD_USER_INPUT', 'Set the meeting link and when the pod happens to host this virtual pod');
  }
  validateMeetingDetails('VIRTUAL', meeting);
  validateFutureDates(meeting!.pod_date_time, meeting!.pod_end_date_time, true);
  return {
    meeting_platform: meeting!.meeting_platform?.trim() || null,
    meeting_url: meeting!.meeting_url.trim(),
    meeting_notes: meeting!.meeting_notes?.trim() || null,
    pod_date_time: new Date(meeting!.pod_date_time),
    pod_end_date_time: new Date(meeting!.pod_end_date_time),
  };
}

export async function hostAssignAutoPod(
  userId: string,
  autoPodId: string,
  locationId?: string | null,
  podAmount?: number | null,
  noOfSpots?: number | null,
  meeting?: HostMeetingInput | null
) {
  const doc = await loadOffer(autoPodId);
  // Idempotent: a double tap is the same host arriving twice, not a conflict —
  // and, should the last enrolment have failed to create the pod, the retry.
  if (doc.host_claim && String(doc.host_claim.user_id) === userId) {
    return finishIfComplete(doc, userId);
  }
  if (!isPreLive(doc) || doc.host_claim) {
    autoPodFail('CONFLICT', 'Another host has already taken this Auto Pod.');
  }
  // Enrolment runs venue → host → club admin: a physical offer reaches hosts
  // only once a venue has fixed the slot.
  if (doc.pod_mode !== 'VIRTUAL' && !doc.venue_claim) {
    autoPodFail('CONFLICT', 'A venue has to accept this Auto Pod before a host can take it.');
  }
  await assertActiveHost(userId);

  // The host's own numbers on the pod. The template carries none, so what
  // the host sends is what the pod is priced at.
  const amount = podAmount ?? doc.pod_amount ?? 0;
  const spots = noOfSpots ?? doc.no_of_spots ?? 0;
  if (amount < 1 || amount > 1999) {
    autoPodFail('BAD_USER_INPUT', 'Ticket price must be between 1 and 1999');
  }
  const limits = await spotLimits(doc);
  if (spots < limits.min || spots > limits.max) {
    autoPodFail('BAD_USER_INPUT', `Spots must be between ${limits.min} and ${limits.max}`);
  }
  const meetingFields = hostMeetingFields(doc, meeting);

  const subIds = await autoPodService.hostSubCategoryIds(userId);
  if (!subIds.some((id) => String(id) === String(doc.sub_category_id))) {
    autoPodFail('FORBIDDEN', 'You are not an approved host in this category');
  }
  const location = await resolveEnrolmentLocation(doc, locationId, 'HOST', {
    missing: 'Select the city you will host in first',
    mismatch: mismatchMessage(doc, 'you'),
  });

  // The host sees what their own rates make of this pod before committing —
  // against the venue's price when one has already enrolled.
  await breakdownService.assertViablePodEconomics({
    hostUserId: userId,
    podAmount: amount,
    noOfSpots: spots,
    venueId: doc.venue_claim ? String(doc.venue_claim.venue_id) : null,
    venueAmount: doc.venue_claim?.slot_price ?? 0,
  });

  const hostName = await displayName(userId);
  const write = (loc: EnrolmentLocation) =>
    AutoPodModel.findOneAndUpdate(
      { _id: doc._id, ...PRE_LIVE_FILTER, host_claim: null, ...loc.guard },
      {
        $set: claimSet(
          {
            host_claim: {
              user_id: new Types.ObjectId(userId),
              host_name: hostName,
              assigned_at: new Date(),
            },
            pod_amount: amount,
            no_of_spots: spots,
            ...meetingFields,
          },
          loc
        ),
        $push: {
          events: autoPodEvent(
            'HOST_ENROLL',
            userId,
            hostName,
            `Host assigned themselves${pinNote(loc.pin)}`
          ),
        },
      },
      { new: true }
    );
  const claimed = await claimWrite(doc._id as Types.ObjectId, location, write);
  if (!claimed) autoPodFail('CONFLICT', 'Another host has already taken this Auto Pod.');

  await autoPodService.setViewerClock(autoPodId, userId, false);
  autoPodNotify.enrolled(claimed, 'host').catch((error) =>
    logs.server.error('autoPod', 'notifyHostEnrolled', { error, auto_pod_id: autoPodId })
  );
  return finishIfComplete(claimed, userId);
}

/** A club admin claims an Auto Pod FOR one of their clubs. The club's own city
 * is what it brings. */
export async function clubClaimAutoPod(actor: any, autoPodId: string, clubId: string) {
  const userId = String(actor.id);
  // Membership first: the idempotent answer below returns the whole offer, and
  // only an admin of that club is entitled to it.
  await clubAdminService.assertClubAdmin(actor, clubId);
  const doc = await loadOffer(autoPodId);
  if (doc.club_claim && String(doc.club_claim.club_id) === String(clubId)) {
    return finishIfComplete(doc, userId);
  }
  if (!isPreLive(doc) || doc.club_claim) {
    autoPodFail('CONFLICT', 'Another club has already claimed this Auto Pod.');
  }
  // The club admin's turn is the last: a host has to be on it first.
  if (!doc.host_claim) {
    autoPodFail('CONFLICT', 'A host has to take this Auto Pod before a club can claim it.');
  }

  const club: any = await ClubModel.findById(clubId)
    .select('club_name category_id location_id is_active')
    .lean();
  if (!club || club.is_active === false) {
    autoPodFail('BAD_USER_INPUT', 'That club is not active');
  }
  // A pod inherits its Super + Sub category from its club, so only a club in
  // the admin-chosen category may claim it — otherwise the live pod would
  // silently carry a category nobody chose.
  if (String(club.category_id ?? '') !== String(doc.sub_category_id)) {
    autoPodFail('BAD_USER_INPUT', "This Auto Pod's category does not match that club");
  }
  const location = await resolveEnrolmentLocation(doc, club.location_id, 'CLUB', {
    missing: 'Set a location on this club before claiming an Auto Pod',
    mismatch: mismatchMessage(doc, 'the club'),
  });

  const write = (loc: EnrolmentLocation) =>
    AutoPodModel.findOneAndUpdate(
      { _id: doc._id, ...PRE_LIVE_FILTER, club_claim: null, ...loc.guard },
      {
        $set: claimSet(
          {
            club_claim: {
              club_id: new Types.ObjectId(clubId),
              club_name: club.club_name ?? '',
              user_id: new Types.ObjectId(userId),
              claimed_at: new Date(),
            },
          },
          loc
        ),
        $push: {
          events: autoPodEvent(
            'CLUB_ENROLL',
            userId,
            club.club_name ?? '',
            `Club admin claimed it for their club${pinNote(loc.pin)}`
          ),
        },
      },
      { new: true }
    );
  const claimed = await claimWrite(doc._id as Types.ObjectId, location, write);
  if (!claimed) autoPodFail('CONFLICT', 'Another club has already claimed this Auto Pod.');

  await autoPodService.setViewerClock(autoPodId, userId, false);
  autoPodNotify.enrolled(claimed, 'club').catch((error) =>
    logs.server.error('autoPod', 'notifyClubEnrolled', { error, auto_pod_id: autoPodId })
  );
  return finishIfComplete(claimed, userId);
}

/**
 * A venue takes its slot back. Allowed while the offer is still enrolling —
 * the club admin's claim completes the pod, so there is nothing to withdraw
 * from after it. The slot is released, the offer goes back in front of venues
 * (its window restarts), the pin is dropped when the venue was the only
 * partner, and the Pod Settings penalty comes off the venue's Account Health.
 */
export async function venueWithdrawAutoPod(userId: string, autoPodId: string) {
  const doc = await autoPodService.loadById(autoPodId);
  if (!isPreLive(doc)) autoPodFail('CONFLICT', 'This Auto Pod is no longer enrolling.');
  const claim = doc.venue_claim;
  if (!claim || String(claim.owner_user_id) !== userId) {
    autoPodFail('FORBIDDEN', 'You have not accepted this Auto Pod.');
  }
  const others = !!doc.host_claim || !!doc.club_claim;
  const unpin = doc.location?.bound_by === 'VENUE' && !others;
  const updated = await AutoPodModel.findOneAndUpdate(
    { _id: doc._id, ...PRE_LIVE_FILTER, 'venue_claim.owner_user_id': new Types.ObjectId(userId) },
    {
      $set: {
        venue_claim: null,
        stage: others ? 'CLAIMING' : 'OPEN',
        venue_window_from: new Date(),
        ...(unpin ? { location: null } : {}),
      },
      $push: {
        events: autoPodEvent('VENUE_WITHDRAW', userId, claim.venue_name, 'Venue withdrew its slot'),
      },
    },
    { new: true }
  );
  if (!updated) {
    autoPodFail('CONFLICT', 'This Auto Pod changed while you were cancelling — refresh and try again');
  }
  await venueSlotService.releaseAutoPodSlot(String(claim.venue_slot_id), autoPodId);
  await autoPodService.applyWithdrawPenalty(
    [
      { type: 'VENUE', id: String(claim.venue_id) },
      { type: 'USER', id: userId },
    ],
    `Withdrew the slot from Auto Pod "${doc.pod_title}"`
  );
  // Back on their list, with exactly the time that was left when they accepted.
  await autoPodService.setViewerClock(autoPodId, userId, true);
  autoPodNotify.withdrawn(updated, 'venue', claim.venue_name).catch((error) =>
    logs.server.error('autoPod', 'notifyVenueWithdrawn', { error, auto_pod_id: autoPodId })
  );
  return autoPodToPub(updated);
}

/**
 * A host steps off. Allowed while the offer is still enrolling; the offer
 * goes back in front of hosts, the pin is dropped when the host was the only
 * partner (a virtual offer they pinned), and the Pod Settings penalty comes
 * off the host's own Account Health.
 */
export async function hostWithdrawAutoPod(userId: string, autoPodId: string) {
  const doc = await autoPodService.loadById(autoPodId);
  if (!isPreLive(doc)) autoPodFail('CONFLICT', 'This Auto Pod is no longer enrolling.');
  const claim = doc.host_claim;
  if (!claim || String(claim.user_id) !== userId) {
    autoPodFail('FORBIDDEN', 'You have not taken this Auto Pod.');
  }
  const others = !!doc.venue_claim || !!doc.club_claim;
  const unpin = doc.location?.bound_by === 'HOST' && !others;
  const updated = await AutoPodModel.findOneAndUpdate(
    { _id: doc._id, ...PRE_LIVE_FILTER, 'host_claim.user_id': new Types.ObjectId(userId) },
    {
      $set: {
        host_claim: null,
        stage: others ? 'CLAIMING' : 'OPEN',
        ...(unpin ? { location: null } : {}),
        // The price, the spots and (on a virtual offer) the meeting were this
        // host's; the next one brings their own.
        pod_amount: 0,
        no_of_spots: 0,
        meeting_platform: null,
        meeting_url: null,
        meeting_notes: null,
        pod_date_time: null,
        pod_end_date_time: null,
      },
      $push: { events: autoPodEvent('HOST_WITHDRAW', userId, claim.host_name, 'Host stepped off') },
    },
    { new: true }
  );
  if (!updated) {
    autoPodFail('CONFLICT', 'This Auto Pod changed while you were cancelling — refresh and try again');
  }
  await autoPodService.applyWithdrawPenalty(
    [{ type: 'USER', id: userId }],
    `Stepped off Auto Pod "${doc.pod_title}"`
  );
  await autoPodService.setViewerClock(autoPodId, userId, true);
  autoPodNotify.withdrawn(updated, 'host', claim.host_name).catch((error) =>
    logs.server.error('autoPod', 'notifyHostWithdrawn', { error, auto_pod_id: autoPodId })
  );
  return autoPodToPub(updated);
}

/**
 * A club admin takes their club's claim back. Allowed while the offer is still
 * enrolling — once everyone is on it the pod exists and is cancelled from the
 * Pods page instead. The offer returns to the club queue's "Needs your action"
 * (a host is still on it, so it is a club's turn again), the pin is dropped
 * when the club was the only partner — the case for an Auto Pod a club admin
 * opened for their own club — and the Pod Settings penalty comes off the
 * admin's own Account Health, exactly as a venue's or a host's does.
 */
export async function clubWithdrawAutoPod(actor: any, autoPodId: string) {
  const userId = String(actor.id);
  const doc = await autoPodService.loadById(autoPodId);
  if (!isPreLive(doc)) autoPodFail('CONFLICT', 'This Auto Pod is no longer enrolling.');
  const claim = doc.club_claim;
  if (!claim) autoPodFail('FORBIDDEN', 'No club has claimed this Auto Pod.');
  // Any admin of the claiming club may take it back, not only whoever claimed
  // it — the claim belongs to the club, and its admins share it.
  await clubAdminService.assertClubAdmin(actor, String(claim!.club_id));

  const others = !!doc.venue_claim || !!doc.host_claim;
  const unpin = doc.location?.bound_by === 'CLUB' && !others;
  const updated = await AutoPodModel.findOneAndUpdate(
    { _id: doc._id, ...PRE_LIVE_FILTER, 'club_claim.club_id': claim!.club_id },
    {
      $set: {
        club_claim: null,
        stage: others ? 'CLAIMING' : 'OPEN',
        ...(unpin ? { location: null } : {}),
      },
      $push: {
        events: autoPodEvent('CLUB_WITHDRAW', userId, claim!.club_name, 'Club admin withdrew the claim'),
      },
    },
    { new: true }
  );
  if (!updated) {
    autoPodFail('CONFLICT', 'This Auto Pod changed while you were cancelling — refresh and try again');
  }
  await autoPodService.applyWithdrawPenalty(
    [{ type: 'USER', id: userId }],
    `Withdrew the club claim on Auto Pod "${doc.pod_title}"`
  );
  await autoPodService.setViewerClock(autoPodId, userId, true);
  autoPodNotify.withdrawn(updated, 'club', claim!.club_name).catch((error) =>
    logs.server.error('autoPod', 'notifyClubWithdrawn', { error, auto_pod_id: autoPodId })
  );
  return autoPodToPub(updated);
}

/** Everyone enrolled? Then this claim is the one that takes it live. */
async function finishIfComplete(doc: IAutoPod, actorUserId: string) {
  if (!isAutoPodComplete(doc)) return autoPodToPub(doc);
  return autoPodToPub(await materializeAutoPod(String(doc._id), actorUserId));
}

/**
 * Turn a fully-enrolled Auto Pod into an ordinary Pod.
 *
 * The MATERIALIZING flip is conditional, so when two claims land at the same
 * instant and both observe a complete trio, exactly one of them creates the
 * pod. Everything after that runs through `podService.create` — the one funnel
 * — which re-checks every invariant with the real host, club, venue and date,
 * and writes the pod's ordinary CREATE audit row. A failure puts the Auto Pod
 * back in CLAIMING with the real error surfaced to whoever made the final
 * claim; it is retried by any claimant tapping again, by the admin fixing the
 * template, and by the recovery sweep.
 */
export async function materializeAutoPod(
  autoPodId: string,
  actorUserId: string | null
): Promise<IAutoPod> {
  const locked = await AutoPodModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(autoPodId),
      stage: 'CLAIMING',
      ...AUTO_POD_COMPLETE_FILTER,
    },
    { $set: { stage: 'MATERIALIZING' } },
    { new: true }
  );
  // Someone else is already taking it live (or it moved on) — report what is.
  if (!locked) return autoPodService.loadById(autoPodId);

  try {
    const pod = await createPodFromAutoPod(locked);
    if (!pod) autoPodFail('INTERNAL_SERVER_ERROR', 'The pod could not be created');
    return goLive(locked, String(pod.id), actorUserId, 'Everyone enrolled — pod created');
  } catch (err) {
    // The failure may have come AFTER the pod row was written (the handover or
    // the notification, not the create). A pod that exists is live whatever
    // this request thinks — finish its handover rather than reopening an offer
    // whose pod is already bookable.
    const created: any = await PodModel.findOne({ source_auto_pod_id: locked._id })
      .select('_id')
      .lean();
    if (created) {
      logs.server.error('autoPod', 'materializeAfterCreate', { error: err, auto_pod_id: autoPodId });
      return goLive(locked, String(created._id), actorUserId, 'Pod created — handover completed after an interrupted write');
    }
    // Put it back so the remaining claimants keep their enrolments and an admin
    // can fix the cause (usually pricing) without anyone losing their place.
    await AutoPodModel.updateOne(
      { _id: locked._id, stage: 'MATERIALIZING' },
      {
        $set: { stage: 'CLAIMING' },
        $push: {
          events: autoPodEvent(
            'MATERIALIZE_FAILED',
            actorUserId,
            '',
            err instanceof Error ? err.message : 'Could not create the pod'
          ),
        },
      }
    );
    logs.server.error('autoPod', 'materialize', { error: err, auto_pod_id: autoPodId });
    throw err;
  }
}

/** MATERIALIZING → LIVE, pointing at the pod, and everyone told. */
async function goLive(locked: IAutoPod, podId: string, actorUserId: string | null, note: string) {
  const live = await AutoPodModel.findOneAndUpdate(
    { _id: locked._id, stage: 'MATERIALIZING' },
    {
      $set: {
        stage: 'LIVE',
        pod_id: new Types.ObjectId(podId),
        materialized_at: new Date(),
      },
      $push: { events: autoPodEvent('LIVE', actorUserId, '', note) },
    },
    { new: true }
  );
  autoPodNotify.live(live ?? locked).catch((error) =>
    logs.server.error('autoPod', 'notifyLive', { error, auto_pod_id: String(locked._id) })
  );
  return live ?? locked;
}

/**
 * Where and when the pod happens. A physical offer takes both from the slot
 * its venue committed, and hands that slot over rather than claiming it
 * afresh; a virtual offer carries its own meeting link and window, and has no
 * slot to hand over — only the Auto Pod id, so the pod still knows its parent.
 */
function placeOf(doc: IAutoPod) {
  if (doc.pod_mode === 'VIRTUAL') {
    return {
      input: {
        pod_mode: 'VIRTUAL',
        venue_id: null,
        venue_slot_id: null,
        meeting_platform: doc.meeting_platform ?? null,
        meeting_url: doc.meeting_url ?? null,
        meeting_notes: doc.meeting_notes ?? null,
        pod_date_time: doc.pod_date_time?.toISOString() ?? null,
        pod_end_date_time: doc.pod_end_date_time?.toISOString() ?? null,
      },
      opts: { autoPodId: String(doc._id) },
    };
  }
  const venueClaim = doc.venue_claim!;
  return {
    input: {
      pod_mode: 'PHYSICAL',
      venue_id: String(venueClaim.venue_id),
      venue_slot_id: String(venueClaim.venue_slot_id),
      pod_date_time: venueClaim.pod_date_time.toISOString(),
      pod_end_date_time: venueClaim.pod_end_date_time?.toISOString() ?? null,
    },
    opts: {
      autoPodSlot: { slotId: String(venueClaim.venue_slot_id), autoPodId: String(doc._id) },
    },
  };
}

/** The `podService.create` call — a normal pod in every respect. */
async function createPodFromAutoPod(doc: IAutoPod) {
  const hostClaim = doc.host_claim!;
  const clubClaim = doc.club_claim!;
  const place = placeOf(doc);
  const input = {
    pod_title: doc.pod_title,
    pod_description: doc.pod_description,
    pod_info: doc.pod_info ?? '',
    pod_hashtag: doc.pod_hashtag ?? [],
    pod_images_and_videos: (doc.pod_images_and_videos ?? []).map((m) => ({
      url: m.url,
      type: m.type ?? 'IMAGE',
    })),
    reel_url: doc.reel_url ?? null,
    pod_type: 'PAID',
    pod_amount: doc.pod_amount ?? 0,
    no_of_spots: doc.no_of_spots ?? 0,
    pod_occurrence: doc.pod_occurrence ?? 'ONE_TIME',
    what_this_pod_offers: doc.what_this_pod_offers ?? [],
    available_perks: doc.available_perks ?? [],
    payment_terms: doc.payment_terms ?? null,
    place_charges: (doc.place_charges ?? []).map((c) => ({
      label: c.label,
      amount: c.amount ?? 0,
      note: c.note ?? null,
    })),
    products_enabled: !!doc.products_enabled,
    product_requests: (doc.product_requests ?? []).map((item) => ({
      product_id: String(item.product_id),
      quantity: item.quantity,
    })),
    club_id: String(clubClaim.club_id),
    pod_hosts_id: [String(hostClaim.user_id)],
    ...place.input,
    is_active: true,
  };
  const audit = {
    actorUserId: null,
    source: 'SYSTEM' as const,
    note: `Materialized from Auto Pod ${doc.auto_pod_no}`,
  };
  const opts = place.opts;
  try {
    return await podService.create(input, audit, opts);
  } catch (err) {
    // The claiming club may already own a pod with this title. Retry once under
    // a slug that is unique inside that club rather than failing the enrolment.
    if (!isSlugConflict(err)) throw err;
    return podService.create(
      { ...input, pod_id: `${doc.pod_title}-${doc.auto_pod_no}` },
      audit,
      opts
    );
  }
}

function isSlugConflict(err: unknown): boolean {
  const code = (err as { extensions?: { code?: string } })?.extensions?.code;
  const message = err instanceof Error ? err.message : '';
  return code === 'CONFLICT' && message.includes('already exists in this club');
}
