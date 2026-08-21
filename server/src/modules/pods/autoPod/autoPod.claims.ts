import { Types } from 'mongoose';
import { AutoPodModel, type IAutoPod } from './autoPod.model';
import { autoPodEvent, autoPodFail, autoPodService, autoPodToPub } from './autoPod.service';
import { autoPodNotify } from './autoPod.notify';
import { ClubModel } from '@modules/clubs/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { venueSlotService, ensureOwnedVenue } from '@modules/venues/venueSlot/venueSlot.service';
import { assertActiveHost, podService } from '@modules/pods/pod/pod.service';
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
 * A venue accepts an open Auto Pod and commits one of its own slots — accept and
 * date/time/slot are ONE action, because an acceptance without a slot would
 * leave the offer half-claimed with nothing for a host to see.
 *
 * Ordering: the venue books its OWN slot first, then races every other venue on
 * a conditional claim of the Auto Pod. That single conditional write is what
 * picks the winner; a loser compensates by releasing the slot IT booked (keyed
 * on both ids, so it can never touch the winner's slot). Booking first also
 * means the slot is continuously BOOKED from acceptance until the pod goes live
 * — no window in which an ordinary pod could take it.
 */
export async function venueAcceptAutoPod(
  userId: string,
  autoPodId: string,
  venueId: string,
  slotId: string
) {
  const doc = await autoPodService.loadById(autoPodId);
  if (doc.stage !== 'OPEN') {
    autoPodFail('CONFLICT', 'This Auto Pod has already been accepted by another venue.');
  }

  const venue = await ensureOwnedVenue(userId, venueId);
  if (venue.status !== 'APPROVED' || venue.is_active === false) {
    autoPodFail('FORBIDDEN', 'Only an approved, active venue can accept an Auto Pod');
  }

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
  // — rather than at materialization, when a host and a club admin have already
  // enrolled on the strength of this slot.
  await breakdownService.assertViablePodEconomics({
    hostUserId: null,
    podAmount: doc.pod_amount ?? 0,
    noOfSpots: doc.no_of_spots ?? 0,
    venueId: String(venueId),
    venueAmount: slot!.price ?? 0,
  });

  await venueSlotService.bookForAutoPod(slotId, venueId, userId, autoPodId);

  const claimed = await AutoPodModel.findOneAndUpdate(
    { _id: doc._id, stage: 'OPEN', venue_claim: null },
    {
      $set: {
        stage: 'CLAIMING',
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
      $push: {
        events: autoPodEvent('VENUE_ENROLL', userId, venue.venue_name ?? '', 'Venue accepted and picked a slot'),
      },
    },
    { new: true }
  );
  if (!claimed) {
    // Lost the race: give back only the slot this attempt booked.
    await venueSlotService.releaseAutoPodSlot(slotId, autoPodId);
    autoPodFail('CONFLICT', 'This Auto Pod has already been accepted by another venue.');
  }

  autoPodNotify.venueEnrolled(claimed).catch((error) =>
    logs.server.error('autoPod', 'notifyVenueEnrolled', { error, auto_pod_id: autoPodId })
  );
  return autoPodToPub(claimed);
}

/** A host assigns themselves to a venue-accepted Auto Pod. */
export async function hostAssignAutoPod(userId: string, autoPodId: string) {
  const doc = await autoPodService.loadById(autoPodId);
  // Idempotent: a double tap is the same host arriving twice, not a conflict.
  if (doc.host_claim && String(doc.host_claim.user_id) === userId) {
    return autoPodToPub(doc);
  }
  if (doc.stage !== 'CLAIMING') {
    autoPodFail('BAD_REQUEST', 'This Auto Pod is not ready for hosts yet');
  }
  await assertActiveHost(userId);

  const subIds = await autoPodService.hostSubCategoryIds(userId);
  if (!subIds.some((id) => String(id) === String(doc.sub_category_id))) {
    autoPodFail('FORBIDDEN', 'You are not an approved host in this category');
  }

  // The host sees what their own rates make of this pod before committing.
  await breakdownService.assertViablePodEconomics({
    hostUserId: userId,
    podAmount: doc.pod_amount ?? 0,
    noOfSpots: doc.no_of_spots ?? 0,
    venueId: doc.venue_claim ? String(doc.venue_claim.venue_id) : null,
    venueAmount: doc.venue_claim?.slot_price ?? 0,
  });

  const hostName = await displayName(userId);
  const claimed = await AutoPodModel.findOneAndUpdate(
    { _id: doc._id, stage: 'CLAIMING', host_claim: null },
    {
      $set: {
        host_claim: {
          user_id: new Types.ObjectId(userId),
          host_name: hostName,
          assigned_at: new Date(),
        },
      },
      $push: { events: autoPodEvent('HOST_ENROLL', userId, hostName, 'Host assigned themselves') },
    },
    { new: true }
  );
  if (!claimed) autoPodFail('CONFLICT', 'Another host has already taken this Auto Pod.');

  autoPodNotify.hostEnrolled(claimed).catch((error) =>
    logs.server.error('autoPod', 'notifyHostEnrolled', { error, auto_pod_id: autoPodId })
  );
  return finishIfComplete(claimed!, userId);
}

/** A club admin claims a venue-accepted Auto Pod FOR one of their clubs. */
export async function clubClaimAutoPod(actor: any, autoPodId: string, clubId: string) {
  const userId = String(actor.id);
  const doc = await autoPodService.loadById(autoPodId);
  if (doc.club_claim && String(doc.club_claim.club_id) === String(clubId)) {
    return autoPodToPub(doc);
  }
  if (doc.stage !== 'CLAIMING') {
    autoPodFail('BAD_REQUEST', 'This Auto Pod is not ready for club admins yet');
  }
  await clubAdminService.assertClubAdmin(actor, clubId);

  const club: any = await ClubModel.findById(clubId)
    .select('club_name category_id is_active')
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

  const claimed = await AutoPodModel.findOneAndUpdate(
    { _id: doc._id, stage: 'CLAIMING', club_claim: null },
    {
      $set: {
        club_claim: {
          club_id: new Types.ObjectId(clubId),
          club_name: club.club_name ?? '',
          user_id: new Types.ObjectId(userId),
          claimed_at: new Date(),
        },
      },
      $push: {
        events: autoPodEvent('CLUB_ENROLL', userId, club.club_name ?? '', 'Club admin claimed it for their club'),
      },
    },
    { new: true }
  );
  if (!claimed) autoPodFail('CONFLICT', 'Another club has already claimed this Auto Pod.');

  autoPodNotify.clubEnrolled(claimed).catch((error) =>
    logs.server.error('autoPod', 'notifyClubEnrolled', { error, auto_pod_id: autoPodId })
  );
  return finishIfComplete(claimed!, userId);
}

/** All three enrolled? Then this claim is the one that takes it live. */
async function finishIfComplete(doc: IAutoPod, actorUserId: string) {
  if (!doc.venue_claim || !doc.host_claim || !doc.club_claim) return autoPodToPub(doc);
  return autoPodToPub(await materializeAutoPod(String(doc._id), actorUserId));
}

/**
 * Turn a fully-enrolled Auto Pod into an ordinary Pod.
 *
 * The MATERIALIZING flip is conditional, so when the host's and the club
 * admin's claims land at the same instant and both observe a complete trio,
 * exactly one of them creates the pod. Everything after that runs through
 * `podService.create` — the one funnel — which re-checks every invariant with
 * the real host, club, venue and date, and writes the pod's ordinary CREATE
 * audit row. A failure puts the Auto Pod back in CLAIMING with the real error
 * surfaced to whoever made the final claim.
 */
export async function materializeAutoPod(
  autoPodId: string,
  actorUserId: string | null
): Promise<IAutoPod> {
  const locked = await AutoPodModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(autoPodId),
      stage: 'CLAIMING',
      venue_claim: { $ne: null },
      host_claim: { $ne: null },
      club_claim: { $ne: null },
    },
    { $set: { stage: 'MATERIALIZING' } },
    { new: true }
  );
  // Someone else is already taking it live (or it moved on) — report what is.
  if (!locked) return autoPodService.loadById(autoPodId);

  const venueClaim = locked.venue_claim!;
  const hostClaim = locked.host_claim!;
  const clubClaim = locked.club_claim!;

  try {
    const pod = await createPodFromAutoPod(locked, venueClaim, hostClaim, clubClaim);
    if (!pod) autoPodFail('INTERNAL_SERVER_ERROR', 'The pod could not be created');
    const live = await AutoPodModel.findOneAndUpdate(
      { _id: locked._id, stage: 'MATERIALIZING' },
      {
        $set: {
          stage: 'LIVE',
          pod_id: new Types.ObjectId(String(pod.id)),
          materialized_at: new Date(),
        },
        $push: {
          events: autoPodEvent('LIVE', actorUserId, '', 'All three enrolled — pod created'),
        },
      },
      { new: true }
    );
    autoPodNotify.live(live ?? locked).catch((error) =>
      logs.server.error('autoPod', 'notifyLive', { error, auto_pod_id: autoPodId })
    );
    return live ?? locked;
  } catch (err) {
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

/** The `podService.create` call — a normal pod in every respect, with the slot
 * handed over from the Auto Pod rather than claimed afresh. */
async function createPodFromAutoPod(
  doc: IAutoPod,
  venueClaim: NonNullable<IAutoPod['venue_claim']>,
  hostClaim: NonNullable<IAutoPod['host_claim']>,
  clubClaim: NonNullable<IAutoPod['club_claim']>
) {
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
    pod_mode: 'PHYSICAL',
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
    club_id: String(clubClaim.club_id),
    pod_hosts_id: [String(hostClaim.user_id)],
    venue_id: String(venueClaim.venue_id),
    venue_slot_id: String(venueClaim.venue_slot_id),
    pod_date_time: venueClaim.pod_date_time.toISOString(),
    pod_end_date_time: venueClaim.pod_end_date_time?.toISOString() ?? null,
    is_active: true,
  };
  const audit = {
    actorUserId: null,
    source: 'SYSTEM' as const,
    note: `Materialized from Auto Pod ${doc.auto_pod_no}`,
  };
  const opts = {
    autoPodSlot: { slotId: String(venueClaim.venue_slot_id), autoPodId: String(doc._id) },
  };
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
