/**
 * Auto-cancellation of finance-negative pods (Admin > Pods > Pod Settings).
 *
 * Inside the admin-configured lead window before a pod starts, the sweep runs
 * the same unclamped settlement waterfall the live Finance breakdown shows: if
 * the pool after GST, the platform fee and the club-admin cut cannot cover the
 * venue's booked slot price (`host_receives < 0`), completing the pod would
 * settle the host at ₹0 and leave Duncit eating the shortfall — so the pod is
 * cancelled while the venue's cancellation policy still gives attendees the
 * best refund it ever will.
 *
 * The refund percentage comes from THAT venue's policy bands, not a global
 * constant: the tightest band covering "now" is the charge withheld, no
 * covering band means a full refund, and a `reschedule_only` venue is skipped
 * entirely — the platform does not force a cancellation on a venue that has
 * taken cancelling off the table; that pod is left for an operator to resolve.
 *
 * The cancellation itself goes through `podService.systemCancelPod`, whose
 * inner soft-delete is a CAS on `deleted_at: null` — a duplicate sweep, or a
 * race with a human cancel, is inherently a no-op. SINGLE REPLICA ONLY, like
 * every scheduler here (see whatsapp.scheduler.ts). No-ops under NODE_ENV=test.
 */
import { PodModel } from './pod.model';
import { podService } from './pod.service';
import { podLifecycleFilter } from './pod.lifecycle';
import { VenueModel, type IVenueCancellationPolicy } from '@modules/venues/venue/venue.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import {
  collectedForPod,
  resolveEffectiveRates,
  venueAmountForPod,
  waterfallForAmount,
} from '@modules/finance/finance/settlement.service';
import { logs } from '@observability/log';

const SWEEP_INTERVAL_MS = 10 * 60_000; // every 10 minutes
const FIRST_SWEEP_DELAY_MS = 90_000; // ~1.5 min after boot
const HOUR_MS = 60 * 60 * 1000;

/** The audit note + refund reason + email line for a system cancel. */
const AUTO_CANCEL_REASON =
  'Cancelled automatically — the pod could not cover its venue cost';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * The refund share the venue's policy leaves the attendees, for a cancellation
 * `hoursUntilStart` before the slot. `value` is the charge the venue KEEPS —
 * PERCENT is a share of the booked slot price (`venueAmount`), AMOUNT a flat
 * sum; either way it is a venue-level charge, so it is spread across the pod's
 * collected ticket money as an effective percent. A cancellation no band covers
 * (or an empty policy) refunds in full. Returns null when the venue is
 * reschedule_only — cancellation is off the table there.
 */
export function autoCancelRefundPct(
  policy: IVenueCancellationPolicy | null | undefined,
  hoursUntilStart: number,
  collected: number,
  venueAmount: number
): number | null {
  if (policy?.reschedule_only) return null;
  const covering = (policy?.tiers ?? []).filter((t) => hoursUntilStart <= t.hours_before);
  if (covering.length === 0) return 100;
  // Tightest covering band wins (tiers are stored widest-first).
  const band = covering.reduce(
    (a, b) => (b.hours_before < a.hours_before ? b : a),
    covering[0]
  );
  let charge: number;
  if (band.charge_type === 'AMOUNT') {
    charge = Math.max(0, band.value);
  } else {
    charge = (Math.min(100, Math.max(0, band.value)) / 100) * venueAmount;
  }
  const chargePct = collected > 0 ? Math.min(100, (charge / collected) * 100) : 0;
  return Math.max(0, 100 - chargePct);
}

/** The live host side for the pod as of now — negative means completing the pod
 * would settle the host at ₹0 with Duncit eating the venue-price shortfall.
 * The exact number breakdownService.podFinanceBreakdown shows Finance. */
async function liveHostSide(
  pod: any
): Promise<{ negative: boolean; collected: number; venueAmount: number }> {
  const venueAmount = await venueAmountForPod(pod, 0);
  // No committed venue cost, no way for the pool to fall short of it.
  if (venueAmount <= 0) return { negative: false, collected: 0, venueAmount };
  const [collected, rates] = await Promise.all([
    collectedForPod(pod._id),
    resolveEffectiveRates({
      hostUserId: pod.pod_hosts_id?.[0] ?? null,
      venueId: pod.venue_id ?? null,
    }),
  ]);
  const waterfall = waterfallForAmount(collected, venueAmount, rates, {
    clampVenueToPool: false,
  });
  return { negative: waterfall.host_receives < 0, collected, venueAmount };
}

/** Evaluate one candidate pod; cancel it when it is loss-making. Returns true
 * when this call committed a cancellation. */
async function cancelIfNegative(pod: any, now: number): Promise<boolean> {
  const { negative, collected, venueAmount } = await liveHostSide(pod);
  if (!negative) return false;

  const venue: any = pod.venue_id
    ? await VenueModel.findById(pod.venue_id).select('settings.cancellation').lean()
    : null;
  const hoursUntilStart = (new Date(pod.pod_date_time).getTime() - now) / HOUR_MS;
  const refundPct = autoCancelRefundPct(
    venue?.settings?.cancellation,
    hoursUntilStart,
    collected,
    venueAmount
  );
  if (refundPct === null) {
    logs.server.warn('pod-auto-cancel', 'cancelIfNegative', {
      pod_id: String(pod._id),
      msg: 'finance-negative pod skipped: venue is reschedule_only',
    });
    return false;
  }

  // The policy share rides on the reason: it is the DELETE audit note Finance's
  // Cancel & Refunds row shows, so the operator can see why refunded < collected.
  const refunded = await podService.systemCancelPod(
    String(pod._id),
    `${AUTO_CANCEL_REASON} (venue policy refund: ${round2(refundPct)}%)`,
    refundPct
  );
  if (refunded === null) return false;
  logs.server.info('pod-auto-cancel', 'cancelIfNegative', {
    pod_id: String(pod._id),
    refunded_payments: refunded,
    refund_pct: refundPct,
    msg: 'finance-negative pod auto-cancelled',
  });
  return true;
}

/**
 * One sweep: evaluate every live pod starting inside the lead window and cancel
 * the loss-making ones. Exported so it can be run on demand. Returns how many
 * pods this run cancelled.
 */
export async function runPodAutoCancelSweep(): Promise<number> {
  const settings = await settingsService.getPodAutoCancelSettings();
  if (!settings.enabled) return 0;

  const now = Date.now();
  // Soonest first, and the WHOLE window: a healthy pod stays a candidate until
  // it starts, so a capped unsorted read would re-check the same head every
  // tick and never reach a loss-making pod behind it. Overlap between ticks is
  // already prevented by the `sweeping` guard in startPodAutoCancelScheduler.
  const cursor = PodModel.find({
    ...podLifecycleFilter('UPCOMING', new Date(now)),
    is_active: true,
    pod_date_time: {
      $gt: new Date(now),
      $lte: new Date(now + settings.lead_hours * HOUR_MS),
    },
  })
    .sort({ pod_date_time: 1 })
    .cursor();

  let cancelled = 0;
  for await (const pod of cursor) {
    try {
      if (await cancelIfNegative(pod, now)) cancelled += 1;
    } catch (error) {
      // One pod's failure never aborts the sweep — the next tick retries it.
      logs.server.error('pod-auto-cancel', 'cancelIfNegative', {
        error,
        pod_id: pod.id,
        msg: 'auto-cancel evaluation failed',
      });
    }
  }
  return cancelled;
}

/** Start the auto-cancel loop (first sweep ~1.5 min after boot). Returns a stop
 * function. No-ops under NODE_ENV=test. */
export function startPodAutoCancelScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  // Refund + notification fan-out is slow, sequential I/O — never let a long
  // sweep overlap the next tick.
  let sweeping = false;
  const sweep = () => {
    if (sweeping) return;
    sweeping = true;
    runPodAutoCancelSweep()
      .catch((error) => {
        logs.server.error('pod-auto-cancel', 'sweep', { error, msg: 'sweep failed' });
      })
      .finally(() => {
        sweeping = false;
      });
  };
  const first = setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  // Never keep the process alive just for the auto-cancel sweep.
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
