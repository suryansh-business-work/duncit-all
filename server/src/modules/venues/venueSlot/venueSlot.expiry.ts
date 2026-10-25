/**
 * Booking requests the venue never answered in time.
 *
 * A host asks a partner venue for a slot and the pod waits offline until the
 * owner approves it. If the owner never opens the page, the slot's own start
 * time arrives and the question stops being answerable — the pod could not have
 * run. Left alone the request sat in Partners > Venue Owner > Slot Requests
 * still saying "Awaiting decision", the host was never told, and the slot stayed
 * held against a pod that was never going to happen.
 *
 * So the deadline IS the decision: once `start_at` has passed, the request is
 * declined with that as its reason.
 *
 * A booking OFFER has a second, earlier clock, set by the venue (Venue settings
 * > Booking offers > response time; the platform default when it set none):
 * every offer and counter must be answered within it, and never later than the
 * start. When `offer.expires_at` passes unanswered the offer expires the same
 * way — declined, the time freed, the pod back with its host — so neither side
 * can be kept waiting by silence, and the host can send a new offer from the
 * venue chat.
 *
 * The write goes through `venueSlotService.expireRequest`, which is the SAME
 * path the owner's own decline takes: the pod comes out of PENDING and goes
 * offline, the host gets the notification, the slot returns to AVAILABLE and an
 * audit row records it — sourced SYSTEM rather than VENUE_OWNER. That guard is
 * also what makes this idempotent, so a duplicate sweep or a race with a human
 * decline is a no-op.
 *
 * SINGLE REPLICA ONLY, like every scheduler here (see whatsapp.scheduler.ts).
 * No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { VenueSlotModel } from './venueSlot.model';
import { venueSlotService } from './venueSlot.service';

const SWEEP_INTERVAL_MS = 10 * 60_000; // every 10 minutes
const FIRST_SWEEP_DELAY_MS = 90_000; // ~1.5 min after boot

/**
 * The reason stored on the slot, shown to the host and written to the audit
 * trail. It names what actually happened — the venue never looked — rather than
 * implying the venue considered the pod and turned it down.
 */
export const SLOT_REQUEST_EXPIRED_REASON = 'Missed View Deadline by the Venue';

/** Why an offer expired: whoever's move it was did not make it in time. */
export const OFFER_EXPIRED_REASON = {
  VENUE: 'The venue did not answer the offer in time',
  HOST: 'The host did not answer the counter offer in time',
} as const;

/** The reason stored for one overdue request: the start passing, or its offer running out. */
function expiryReason(slot: { start_at: Date; offer?: { status?: string | null } | null }, now: Date): string {
  if (slot.start_at.getTime() <= now.getTime() || !slot.offer) return SLOT_REQUEST_EXPIRED_REASON;
  return slot.offer.status === 'COUNTERED' ? OFFER_EXPIRED_REASON.HOST : OFFER_EXPIRED_REASON.VENUE;
}

/**
 * One sweep: decline every pending request whose slot has already started, or
 * whose offer was not answered in time. Exported so it can be run on demand.
 * Returns how many this run declined.
 */
export async function runSlotRequestExpirySweep(): Promise<number> {
  // Oldest first, and no limit clause: a request only ever becomes MORE overdue,
  // so nothing here can be starved by a capped read the way a sliding window
  // would be. Overlap between ticks is prevented by the `sweeping` guard below.
  const now = new Date();
  const cursor = VenueSlotModel.find({
    status: 'PENDING',
    booked_by_pod_id: { $ne: null },
    $or: [{ start_at: { $lte: now } }, { 'offer.expires_at': { $lte: now } }],
  })
    .sort({ start_at: 1 })
    .cursor();

  let declined = 0;
  for await (const slot of cursor) {
    try {
      if (await venueSlotService.expireRequest(slot, expiryReason(slot, now))) {
        declined += 1;
        logs.server.info('venue-slot-expiry', 'expireRequest', {
          slot_id: String(slot._id),
          pod_id: String(slot.decided_pod_id ?? ''),
          msg: 'unanswered slot request auto-declined',
        });
      }
    } catch (error) {
      // One request's failure never aborts the sweep — the next tick retries it,
      // and the PENDING guard means a partial write cannot double-decline.
      logs.server.error('venue-slot-expiry', 'expireRequest', {
        error,
        slot_id: String(slot._id),
        msg: 'auto-decline failed',
      });
    }
  }
  return declined;
}

/** Start the expiry loop (first sweep ~1.5 min after boot). Returns a stop
 * function. No-ops under NODE_ENV=test. */
export function startSlotRequestExpiryScheduler(): () => void {
  // Each decline fans out a notification and an audit write; startClusterJob
  // never lets a long sweep overlap the next tick.
  return startClusterJob({
    component: 'venue-slot-expiry',
    operation: 'sweep',
    firstDelayMs: FIRST_SWEEP_DELAY_MS,
    intervalMs: SWEEP_INTERVAL_MS,
    run: async () => {
      const declined = await runSlotRequestExpirySweep();
      if (declined > 0) logs.server.info('venue-slot-expiry', 'sweep', { declined });
      // Pod Requests holding a slot that has started with no pod free it on the same tick.
      const { runPartnerRequestExpirySweep } = await import(
        '@modules/venues/podPartnerRequest/podPartnerRequest.lifecycle'
      );
      await runPartnerRequestExpirySweep();
    },
  });
}
