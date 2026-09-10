/**
 * Auto-cancellation of finance-negative pods (Admin > Pods > Pod Settings).
 *
 * Inside the lead window before a pod starts, the sweep runs the same unclamped
 * settlement waterfall the live Finance breakdown shows: if the pool after GST,
 * the platform fee and the club-admin cut cannot cover the venue's booked slot
 * price (`host_receives < 0`), completing the pod would settle the host at ₹0
 * and leave Duncit eating the shortfall — so the pod is cancelled while the
 * venue's refund ladder still gives attendees the best refund it ever will.
 *
 * That window is per-venue: `settings.cancellation.trigger_hours` (Onboarding >
 * Onboarded Venues > Review, default 6) is how close to the start a pod at THAT
 * venue may still be cancelled. A pod with no venue behind it — a virtual pod —
 * falls to the platform-wide lead hours in Admin > Pods > Pod Settings, which is
 * also the switch that turns the whole sweep on.
 *
 * The refund percentage comes from THAT venue's refund ladder, not a global
 * constant: the widest band the remaining notice still clears is what attendees
 * get back, a ladder with no matching band refunds nothing, an empty ladder
 * refunds in full, and a `reschedule_only` venue is skipped entirely — the
 * platform does not force a cancellation on a venue that has taken cancelling
 * off the table; that pod is left for an operator to resolve.
 *
 * The cancellation itself goes through `podService.systemCancelPod`, whose
 * inner soft-delete is a CAS on `deleted_at: null` — a duplicate sweep, or a
 * race with a human cancel, is inherently a no-op. SINGLE REPLICA ONLY, like
 * every scheduler here (see whatsapp.scheduler.ts). No-ops under NODE_ENV=test.
 */
import { PodModel } from './pod.model';
import { podService } from './pod.service';
import { podLifecycleFilter } from './pod.lifecycle';
import { podFinanceNow, runPodCancellationRiskSweep } from './pod.cancellationRisk';
import {
  DEFAULT_CANCELLATION_TRIGGER_HOURS,
  VenueModel,
  type IVenueCancellationPolicy,
} from '@modules/venues/venue/venue.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { logs } from '@observability/log';

const SWEEP_INTERVAL_MS = 10 * 60_000; // every 10 minutes
const FIRST_SWEEP_DELAY_MS = 90_000; // ~1.5 min after boot
const HOUR_MS = 60 * 60 * 1000;

/** The audit note + refund reason + email line for a system cancel. */
const AUTO_CANCEL_REASON =
  'Cancelled automatically — the pod could not cover its venue cost';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * The share of their ticket money the venue's refund ladder leaves the
 * attendees, for a cancellation `hoursUntilStart` before the pod starts.
 *
 * A band pays when the notice CLEARS it, and the widest band it clears is the
 * one that pays — so more notice can never buy a worse refund. A ladder no band
 * matches refunds nothing (the operator wrote a floor and this is under it),
 * while a venue with no ladder at all refunds in full, which is what every
 * venue does until Onboarding sets one. Returns null when the venue is
 * reschedule_only — cancellation is off the table there.
 */
export function autoCancelRefundPct(
  policy: IVenueCancellationPolicy | null | undefined,
  hoursUntilStart: number
): number | null {
  if (policy?.reschedule_only) return null;
  const tiers = policy?.refund_tiers ?? [];
  if (tiers.length === 0) return 100;
  const cleared = tiers.filter((tier) => hoursUntilStart > tier.hours_before);
  if (cleared.length === 0) return 0;
  // Widest cleared band wins (tiers are stored widest-first).
  const band = cleared.reduce((a, b) => (b.hours_before > a.hours_before ? b : a), cleared[0]);
  return Math.min(100, Math.max(0, Number(band.refund_pct) || 0));
}

/** How close to the start a pod at this venue may still be auto-cancelled.
 * Venues onboarded before the field existed hold no number of their own and
 * answer to the same 6 hours a new venue is created with, so the window never
 * silently differs between two venues an operator never edited. */
export function venueTriggerHours(policy: IVenueCancellationPolicy | null | undefined): number {
  const hours = Number(policy?.trigger_hours);
  return Number.isFinite(hours) ? hours : DEFAULT_CANCELLATION_TRIGGER_HOURS;
}

/** Evaluate one candidate pod; cancel it when it is loss-making. Returns true
 * when this call committed a cancellation. The live host side comes from
 * `podFinanceNow` — the one waterfall the risk flag, the risk alerts and the
 * Finance breakdown all read, so the sweep can never cancel a pod the admin
 * page called healthy. */
async function cancelIfNegative(pod: any, now: number, platformLeadHours: number): Promise<boolean> {
  const venue: any = pod.venue_id
    ? await VenueModel.findById(pod.venue_id).select('settings.cancellation').lean()
    : null;
  const hoursUntilStart = (new Date(pod.pod_date_time).getTime() - now) / HOUR_MS;
  // The venue's own trigger, not the query window: the sweep reads out to the
  // widest trigger any venue holds, so a pod whose venue triggers later is seen
  // — and left alone — until its own window opens. It still has that long to
  // sell the seats that would make it whole.
  //
  // Checked BEFORE the waterfall on purpose: a lean read of one subdocument is
  // far cheaper than pricing a pod, and most pods in the read window are not in
  // their own yet.
  const triggerHours = venue ? venueTriggerHours(venue.settings?.cancellation) : platformLeadHours;
  if (hoursUntilStart > triggerHours) return false;

  const { negative } = await podFinanceNow(pod);
  if (!negative) return false;

  const refundPct = autoCancelRefundPct(venue?.settings?.cancellation, hoursUntilStart);
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

/** The widest auto-cancel window any venue holds. The read window has to reach
 * it or a venue whose trigger is longer than the platform lead hours would
 * never have its pods looked at at all. One grouped read per sweep. */
async function widestVenueTriggerHours(): Promise<number> {
  const [row] = await VenueModel.aggregate<{ max: number }>([
    { $group: { _id: null, max: { $max: '$settings.cancellation.trigger_hours' } } },
  ]);
  const max = Number(row?.max);
  // No venue carries the field yet (or there are no venues): every one of them
  // answers to the same default, so that is how far out to read.
  return Number.isFinite(max) ? Math.max(max, DEFAULT_CANCELLATION_TRIGGER_HOURS) : DEFAULT_CANCELLATION_TRIGGER_HOURS;
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
  // Read out to whichever is further: the platform lead hours (which is what a
  // venue-less pod answers to) or the widest venue trigger. Each pod is then
  // gated on its OWN window inside cancelIfNegative.
  const windowHours = Math.max(settings.lead_hours, await widestVenueTriggerHours());
  // Soonest first, and the WHOLE window: a healthy pod stays a candidate until
  // it starts, so a capped unsorted read would re-check the same head every
  // tick and never reach a loss-making pod behind it. Overlap between ticks is
  // already prevented by the `sweeping` guard in startPodAutoCancelScheduler.
  const cursor = PodModel.find({
    ...podLifecycleFilter('UPCOMING', new Date(now)),
    is_active: true,
    pod_date_time: {
      $gt: new Date(now),
      $lte: new Date(now + windowHours * HOUR_MS),
    },
  })
    .sort({ pod_date_time: 1 })
    .cursor();

  let cancelled = 0;
  for await (const pod of cursor) {
    try {
      if (await cancelIfNegative(pod, now, settings.lead_hours)) cancelled += 1;
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

/**
 * Cancel first, then flag and alert: a pod the cancel half just removed must
 * not be alerted about a minute later, and the risk half's clear-down sees it
 * gone. Each half logs its own failure and the other still runs — the alerts
 * are the half a host can act on, and a refund fan-out that failed is no
 * reason to leave them in the dark.
 */
async function runBothSweeps(): Promise<void> {
  try {
    await runPodAutoCancelSweep();
  } catch (error) {
    logs.server.error('pod-auto-cancel', 'sweep', { error, msg: 'sweep failed' });
  }
  try {
    await runPodCancellationRiskSweep();
  } catch (error) {
    logs.server.error('pod-cancel-risk', 'sweep', { error, msg: 'risk sweep failed' });
  }
}

/** Start the auto-cancel + cancellation-risk loop (first sweep ~1.5 min after
 * boot). Returns a stop function. No-ops under NODE_ENV=test. */
export function startPodAutoCancelScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  // Refund + notification fan-out is slow, sequential I/O — never let a long
  // sweep overlap the next tick.
  let sweeping = false;
  const sweep = () => {
    if (sweeping) return;
    sweeping = true;
    runBothSweeps().finally(() => {
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
