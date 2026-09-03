/**
 * Background sweep for the states an Auto Pod cannot leave on its own.
 *
 * 1. EXPIRY — three windows close an offer nobody completed, each releasing
 *    the venue's slot rather than holding it forever: its start has passed
 *    (`validateFutureDates` would reject it), no venue accepted inside Pod
 *    Settings' venue window, or the assignment window ran out with a role
 *    still missing — whoever had enrolled, and each of them is told.
 * 2. STUCK MATERIALIZATION — the MATERIALIZING lock is held by one request; if
 *    that process died mid-way the offer would sit locked for good. Anything
 *    older than the grace window is reconciled: if the pod it was creating
 *    exists, finish the handover; if not, put it back to CLAIMING.
 * 3. COMPLETE BUT NOT LIVE — an offer with every enrolment whose last
 *    materialization failed (usually pricing, since fixed by the admin) is
 *    tried again, because no claim is left to trigger it.
 * 4. LEGACY PINS — offers a club opened before pinning existed are pinned to
 *    that club's city, so a venue elsewhere cannot take them.
 *
 * Idempotent and fault-tolerant (the interval survives any DB error), mirroring
 * `pod-draft.cleanup`. No-ops under NODE_ENV=test.
 */
import { AutoPodModel, type IAutoPod } from './autoPod.model';
import {
  AUTO_POD_COMPLETE_FILTER,
  AUTO_POD_INCOMPLETE_FILTER,
  autoPodEvent,
  autoPodMissingRoles,
  PHYSICAL_FILTER,
  PRE_LIVE_FILTER,
  venueWindowPassed,
} from './autoPod.common';
import { autoPodService } from './autoPod.service';
import { ensureClubPin } from './autoPod.location';
import { autoPodNotify } from './autoPod.notify';
import { PodModel } from '@modules/pods/pod/pod.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { logs } from '@observability/log';

const SWEEP_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes
const FIRST_SWEEP_DELAY_MS = 60_000; // ~1 min after boot
const MATERIALIZE_GRACE_MS = 10 * 60 * 1000;
/** A complete offer left alone this long is not mid-request any more. */
const RETRY_GRACE_MS = 2 * 60 * 1000;

/** Offers whose start has passed: the slot's for a physical one, the admin's
 * own date for a virtual one. */
const startPassed = (now: Date) => ({
  $or: [
    { 'venue_claim.pod_date_time': { $lte: now } },
    { pod_mode: 'VIRTUAL', pod_date_time: { $lte: now } },
  ],
});

/** Offers whose start is still ahead — the mirror of startPassed. */
const startAhead = (now: Date) => ({
  $or: [
    { venue_claim: { $ne: null }, 'venue_claim.pod_date_time': { $gt: now } },
    { pod_mode: 'VIRTUAL', pod_date_time: { $gt: now } },
  ],
});

/**
 * Flip each offer to EXPIRED — conditionally, so a claim racing it to
 * materialization wins cleanly — free whatever slot it held, and tell everyone
 * on it. Returns how many this call actually expired.
 */
async function expireOffers(
  docs: IAutoPod[],
  note: (doc: IAutoPod) => string,
  notify: (won: IAutoPod) => Promise<void>
): Promise<number> {
  let expired = 0;
  for (const doc of docs) {
    const won = await AutoPodModel.findOneAndUpdate(
      { _id: doc._id, ...PRE_LIVE_FILTER },
      {
        $set: { stage: 'EXPIRED' },
        $push: { events: autoPodEvent('EXPIRED', null, '', note(doc)) },
      },
      { new: true }
    );
    if (!won) continue;
    await venueSlotService.releaseForAutoPod(String(doc._id));
    expired += 1;
    notify(won).catch((error) =>
      logs.server.error('autoPod', 'notifyExpired', { error, auto_pod_id: String(doc._id) })
    );
  }
  return expired;
}

/** Expire offers whose start has already passed, releasing the venue's slot. */
async function expireStaleClaiming(): Promise<number> {
  const stale = await AutoPodModel.find({
    stage: 'CLAIMING',
    ...startPassed(new Date()),
  }).limit(100);
  return expireOffers(
    stale,
    () => 'Start date passed before everyone enrolled',
    (won) => autoPodNotify.expired(won)
  );
}

/**
 * A physical offer no venue accepted inside Pod Settings' venue window is
 * already off every venue's list, so it can never complete — release it and
 * tell whoever had enrolled. The same window is what the venue's card counts
 * down.
 */
async function expireUnacceptedByVenue(): Promise<number> {
  const { venueCutoff, venueExpiryHours } = await autoPodService.windows();
  const stale = await AutoPodModel.find({
    ...PRE_LIVE_FILTER,
    ...PHYSICAL_FILTER,
    venue_claim: null,
    ...venueWindowPassed(venueCutoff),
  }).limit(100);
  return expireOffers(
    stale,
    () => `No venue accepted within ${venueExpiryHours} hours`,
    (won) => autoPodNotify.released(won, venueExpiryHours)
  );
}

/**
 * Pod Settings' assignment window: an offer nobody completed within it is
 * released — however many had enrolled — so a venue's slot and a host are not
 * held by an offer going nowhere, and each of them is told why. The venue
 * window above already catches most venue-less offers; this catches the rest,
 * and every offer left waiting on a host or a club admin.
 */
async function expireUnassigned(): Promise<number> {
  const { assignmentCutoff, assignmentExpiryHours } = await autoPodService.windows();
  const stale = await AutoPodModel.find({
    ...PRE_LIVE_FILTER,
    created_at: { $lte: assignmentCutoff },
    ...AUTO_POD_INCOMPLETE_FILTER,
  }).limit(100);
  return expireOffers(
    stale,
    (doc) =>
      `Not fully assigned within ${assignmentExpiryHours} hours — still waiting on ${autoPodMissingRoles(doc).join(', ')}`,
    (won) => autoPodNotify.released(won, assignmentExpiryHours)
  );
}

/** The pod a stuck materialization was creating — `podService.create` stamps
 * the Auto Pod's id on it, so that is the one key that cannot pick up an
 * unrelated pod of the same club, host, venue and hour. */
async function findMaterializedPod(doc: IAutoPod) {
  return PodModel.findOne({ source_auto_pod_id: doc._id });
}

/** Reconcile offers stuck in MATERIALIZING past the grace window. */
async function recoverStuckMaterializing(): Promise<number> {
  const cutoff = new Date(Date.now() - MATERIALIZE_GRACE_MS);
  const stuck = await AutoPodModel.find({
    stage: 'MATERIALIZING',
    updated_at: { $lt: cutoff },
  }).limit(50);
  let recovered = 0;
  for (const doc of stuck) {
    const pod = await findMaterializedPod(doc);
    if (pod) {
      // The pod was created before the crash — finish what was left. A virtual
      // offer held no slot, so there is nothing to hand over.
      if (doc.venue_claim) {
        await venueSlotService
          .transferAutoPodHold(
            String(doc.venue_claim.venue_slot_id),
            String(doc._id),
            String(pod._id)
          )
          .catch(() => undefined);
      }
      await AutoPodModel.updateOne(
        { _id: doc._id, stage: 'MATERIALIZING' },
        {
          $set: { stage: 'LIVE', pod_id: pod._id, materialized_at: new Date() },
          $push: { events: autoPodEvent('LIVE', null, '', 'Recovered after an interrupted create') },
        }
      );
    } else {
      await AutoPodModel.updateOne(
        { _id: doc._id, stage: 'MATERIALIZING' },
        {
          $set: { stage: 'CLAIMING' },
          $push: {
            events: autoPodEvent('MATERIALIZE_FAILED', null, '', 'Interrupted — returned for retry'),
          },
        }
      );
    }
    recovered += 1;
  }
  return recovered;
}

/** Retry offers that have every enrolment but never went live. */
async function retryCompleteClaiming(): Promise<number> {
  const cutoff = new Date(Date.now() - RETRY_GRACE_MS);
  // Two `$or`s — completeness and the future start — so they nest in an `$and`.
  const complete = await AutoPodModel.find({
    stage: 'CLAIMING',
    updated_at: { $lt: cutoff },
    $and: [AUTO_POD_COMPLETE_FILTER, startAhead(new Date())],
  })
    .select('_id')
    .limit(50);
  if (complete.length === 0) return 0;
  const { materializeAutoPod } = await import('./autoPod.claims');
  let live = 0;
  for (const doc of complete) {
    try {
      const result = await materializeAutoPod(String(doc._id), null);
      if (result.stage === 'LIVE') live += 1;
    } catch (error) {
      // Still not viable — the template needs the admin; the trail says why.
      logs.server.warn('autoPod', 'retryMaterialize', { error, auto_pod_id: String(doc._id) });
    }
  }
  return live;
}

/** Pin club-opened offers from before pinning existed to their club's city. */
async function backfillClubPins(): Promise<number> {
  const legacy = await AutoPodModel.find({
    ...PRE_LIVE_FILTER,
    club_claim: { $ne: null },
    location: null,
  }).limit(100);
  let pinned = 0;
  for (const doc of legacy) {
    const after = await ensureClubPin(doc);
    if (after.location) pinned += 1;
  }
  return pinned;
}

/** One full sweep. Exported so it can be run on demand. */
export async function runAutoPodSweep(): Promise<{
  expired: number;
  recovered: number;
  retried: number;
  pinned: number;
}> {
  const pinned = await backfillClubPins();
  const expired =
    (await expireStaleClaiming()) + (await expireUnacceptedByVenue()) + (await expireUnassigned());
  const recovered = await recoverStuckMaterializing();
  const retried = await retryCompleteClaiming();
  return { expired, recovered, retried, pinned };
}

/** Start the Auto Pod sweep loop. Returns a stop function. No-ops under tests. */
export function startAutoPodSweepScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  const sweep = () => {
    runAutoPodSweep().catch((error) => {
      logs.server.error('autoPod', 'sweep', { error, msg: 'auto pod sweep failed' });
    });
  };
  const first = setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  // Never keep the process alive just for this sweep.
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
