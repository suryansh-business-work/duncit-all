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
 * declined with that as its reason. There is no admin-configured grace window
 * and deliberately no separate deadline setting — the slot's start time is the
 * only moment that means anything here, and a second clock would be a second
 * thing to get wrong.
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

/**
 * One sweep: decline every pending request whose slot has already started.
 * Exported so it can be run on demand. Returns how many this run declined.
 */
export async function runSlotRequestExpirySweep(): Promise<number> {
  // Oldest first, and no limit clause: a request only ever becomes MORE overdue,
  // so nothing here can be starved by a capped read the way a sliding window
  // would be. Overlap between ticks is prevented by the `sweeping` guard below.
  const cursor = VenueSlotModel.find({
    status: 'PENDING',
    booked_by_pod_id: { $ne: null },
    start_at: { $lte: new Date() },
  })
    .sort({ start_at: 1 })
    .cursor();

  let declined = 0;
  for await (const slot of cursor) {
    try {
      if (await venueSlotService.expireRequest(slot, SLOT_REQUEST_EXPIRED_REASON)) {
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
  if (process.env.NODE_ENV === 'test') return () => undefined;
  // Each decline fans out a notification and an audit write — never let a long
  // sweep overlap the next tick.
  let sweeping = false;
  const sweep = () => {
    if (sweeping) return;
    sweeping = true;
    runSlotRequestExpirySweep()
      .then((declined) => {
        if (declined > 0) logs.server.info('venue-slot-expiry', 'sweep', { declined });
      })
      .catch((error) => {
        logs.server.error('venue-slot-expiry', 'sweep', { error, msg: 'sweep failed' });
      })
      .finally(() => {
        sweeping = false;
      });
  };
  const first = setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  // Never keep the process alive just for the expiry sweep.
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
