/**
 * Background sweep for the states an Auto Pod cannot leave on its own.
 *
 * 1. EXPIRY — a CLAIMING offer whose accepted slot has already started can
 *    never materialize (`validateFutureDates` would reject it), so it is marked
 *    EXPIRED and the venue gets its slot back rather than having it held
 *    forever by an offer nobody completed.
 * 2. STUCK MATERIALIZATION — the MATERIALIZING lock is held by one request; if
 *    that process died mid-way the offer would sit locked for good. Anything
 *    older than the grace window is reconciled: if the pod it was creating
 *    exists, finish the handover; if not, put it back to CLAIMING.
 * 3. COMPLETE BUT NOT LIVE — an offer with all three enrolments whose last
 *    materialization failed (usually pricing, since fixed by the admin) is
 *    tried again, because no claim is left to trigger it.
 * 4. LEGACY PINS — offers a club opened before pinning existed are pinned to
 *    that club's city, so a venue elsewhere cannot take them.
 *
 * Idempotent and fault-tolerant (the interval survives any DB error), mirroring
 * `pod-draft.cleanup`. No-ops under NODE_ENV=test.
 */
import { AutoPodModel, type IAutoPod } from './autoPod.model';
import { autoPodEvent, PRE_LIVE_FILTER } from './autoPod.common';
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

/** Expire offers whose slot has already started, releasing the venue's slot. */
async function expireStaleClaiming(): Promise<number> {
  const stale = await AutoPodModel.find({
    stage: 'CLAIMING',
    'venue_claim.pod_date_time': { $lte: new Date() },
  }).limit(100);
  let expired = 0;
  for (const doc of stale) {
    const won = await AutoPodModel.findOneAndUpdate(
      { _id: doc._id, stage: 'CLAIMING' },
      {
        $set: { stage: 'EXPIRED' },
        $push: {
          events: autoPodEvent('EXPIRED', null, '', 'Slot date passed before everyone enrolled'),
        },
      },
      { new: true }
    );
    if (!won) continue;
    await venueSlotService.releaseForAutoPod(String(doc._id));
    expired += 1;
    autoPodNotify.expired(won).catch((error) =>
      logs.server.error('autoPod', 'notifyExpired', { error, auto_pod_id: String(doc._id) })
    );
  }
  return expired;
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
      // The pod was created before the crash — finish what was left.
      await venueSlotService
        .transferAutoPodHold(
          String(doc.venue_claim!.venue_slot_id),
          String(doc._id),
          String(pod._id)
        )
        .catch(() => undefined);
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

/** Retry offers that have all three enrolments but never went live. */
async function retryCompleteClaiming(): Promise<number> {
  const cutoff = new Date(Date.now() - RETRY_GRACE_MS);
  const complete = await AutoPodModel.find({
    stage: 'CLAIMING',
    venue_claim: { $ne: null },
    host_claim: { $ne: null },
    club_claim: { $ne: null },
    'venue_claim.pod_date_time': { $gt: new Date() },
    updated_at: { $lt: cutoff },
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
  const expired = await expireStaleClaiming();
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
