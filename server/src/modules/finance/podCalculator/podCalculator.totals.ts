import {
  computePodFinanceBreakdown,
  payableSpots,
  type PodFinanceBreakdown,
} from '@modules/finance/finance/breakdown.math';
import type { IPodCalculatorPod } from './podCalculator.model';

/** One pod's waterfall, plus what it comes to across `pod_count` of them. */
export interface PodCalculatorLine {
  name: string;
  pod_count: number;
  payable_spots: number;
  /** The single pod, straight off the finance engine (paise). */
  per_pod: PodFinanceBreakdown;
  /** per_pod × pod_count, in rupees — what the report and the totals add up. */
  collection_total: number;
  gst_amount: number;
  venue_receives: number;
  host_receives: number;
  duncit_revenue_total: number;
}

export interface PodCalculatorTotals {
  pods: number;
  collection_total: number;
  gst_amount: number;
  venue_receives: number;
  host_receives: number;
  duncit_revenue_total: number;
}

const rupees = (paise: number, count: number) => Math.round(paise * count) / 100;
const add = (a: number, b: number) => Math.round((a + b) * 100) / 100;

/**
 * A saved pod's figures, computed by THE finance engine.
 *
 * `computePodFinanceBreakdown` is what quotes and settles real pods, so the
 * report a partner receives cannot disagree with what they are actually paid —
 * the alternative was a third copy of the waterfall living in a PDF generator,
 * which is the drift rule 34 exists to stop. `clampVenueToPool: false` matches
 * how the engine quotes: on a shortfall the host's remainder goes honestly
 * negative rather than quietly shrinking the venue's money.
 */
export function lineFor(pod: IPodCalculatorPod): PodCalculatorLine {
  const spots = payableSpots(pod.no_of_spots ?? 0);
  const amountPaise = Math.round(Math.max(0, pod.pod_amount ?? 0) * 100) * spots;
  const perPod = computePodFinanceBreakdown(
    amountPaise,
    Math.round(Math.max(0, pod.venue_amount ?? 0) * 100),
    {
      gst_percent: pod.gst_percent ?? 0,
      platform_fee_percent: pod.platform_fee_percent ?? 0,
      host_commission_percent: pod.host_commission_percent ?? 0,
      venue_commission_percent: pod.venue_commission_percent ?? 0,
      club_admin_percent: pod.club_admin_percent ?? 0,
    },
    { clampVenueToPool: false }
  );
  const count = Math.max(0, Math.round(pod.pod_count ?? 1));
  return {
    name: pod.name ?? '',
    pod_count: count,
    payable_spots: spots,
    per_pod: perPod,
    collection_total: rupees(perPod.amount_paise, count),
    gst_amount: rupees(perPod.gst_paise, count),
    venue_receives: rupees(perPod.venue_receives_paise, count),
    host_receives: rupees(perPod.host_receives_paise, count),
    duncit_revenue_total: rupees(perPod.duncit_revenue_paise, count),
  };
}

/** Every line added up — the report's grand total. */
export function totalsOf(lines: readonly PodCalculatorLine[]): PodCalculatorTotals {
  return lines.reduce<PodCalculatorTotals>(
    (acc, line) => ({
      pods: acc.pods + line.pod_count,
      collection_total: add(acc.collection_total, line.collection_total),
      gst_amount: add(acc.gst_amount, line.gst_amount),
      venue_receives: add(acc.venue_receives, line.venue_receives),
      host_receives: add(acc.host_receives, line.host_receives),
      duncit_revenue_total: add(acc.duncit_revenue_total, line.duncit_revenue_total),
    }),
    { pods: 0, collection_total: 0, gst_amount: 0, venue_receives: 0, host_receives: 0, duncit_revenue_total: 0 }
  );
}
