/**
 * Background sweep for the two states an Auto Pod cannot leave on its own.
 *
 * 1. EXPIRY — a CLAIMING offer whose accepted slot has already started can
 *    never materialize (`validateFutureDates` would reject it), so it is marked
 *    EXPIRED and the venue gets its slot back rather than having it held
 *    forever by an offer nobody completed.
 * 2. STUCK MATERIALIZATION — the MATERIALIZING lock is held by one request; if
 *    that process died mid-way the offer would sit locked for good. Anything
 *    older than the grace window is reconciled: if the pod it was creating
 *    exists, finish the handover; if not, put it back to CLAIMING so the last
 *    claimant can try again.
 *
 * Idempotent and fault-tolerant (the interval survives any DB error), mirroring
 * `pod-draft.cleanup`. No-ops under NODE_ENV=test.
 */
import { AutoPodModel, type IAutoPod } from './autoPod.model';
import { autoPodEvent } from './autoPod.service';
import { autoPodNotify } from './autoPod.notify';
import { PodModel } from '@modules/pods/pod/pod.model';
import { venueSlotService } from '@modules/venues/venueSlot/venueSlot.service';
import { logs } from '@observability/log';

const SWEEP_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes
const FIRST_SWEEP_DELAY_MS = 60_000; // ~1 min after boot
const MATERIALIZE_GRACE_MS = 10 * 60 * 1000;

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

/** The pod a stuck materialization was creating, found by its natural key. */
async function findMaterializedPod(doc: IAutoPod) {
  if (!doc.venue_claim || !doc.host_claim || !doc.club_claim) return null;
  return PodModel.findOne({
    club_id: doc.club_claim.club_id,
    pod_hosts_id: doc.host_claim.user_id,
    venue_id: doc.venue_claim.venue_id,
    pod_date_time: doc.venue_claim.pod_date_time,
  });
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
      await PodModel.updateOne(
        { _id: pod._id, source_auto_pod_id: null },
        { $set: { source_auto_pod_id: doc._id } }
      );
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

/** One full sweep. Exported so it can be run on demand. */
export async function runAutoPodSweep(): Promise<{ expired: number; recovered: number }> {
  const expired = await expireStaleClaiming();
  const recovered = await recoverStuckMaterializing();
  return { expired, recovered };
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
