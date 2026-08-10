import type { FilterQuery } from 'mongoose';
import { PodModel } from './pod.model';
import { podSeatsTaken } from './pod.seats';
import { bucketForPod } from '@modules/finance/finance/breakdown.service';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';

/**
 * The roll-up behind BOTH studio pod sections — Club Studio's "Your Pods" and
 * Venue Studio's "Pods hosted on your Venue".
 *
 * One implementation on purpose. These figures were previously computed in the
 * server for clubs and, separately, in mWeb AND in the native app for venues —
 * three versions of one set of rules, which is drift waiting to happen. Worse,
 * the client versions folded the CAPPED list (500 rows), so a venue owner with
 * more pods than that saw a "Total pods" tile reading 500 and a fill rate drawn
 * from a truncated set, under a caption promising the figures counted them all.
 *
 * Computed over EVERY pod matching the filter, uncapped, while the list stays
 * capped. Callers pass an ALREADY-SCOPED filter — this function does no
 * permission work of its own.
 */
export interface StudioPodSummary {
  /** How many clubs / venues the scope covers. */
  scope_count: number;
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  total_spots: number;
  filled_spots: number;
  total_attendees: number;
  fill_rate: number;
  next_pod_date_time: string | null;
  total_revenue: number;
  currency_symbol: string;
}

/** Blank figures. The symbol is filled by the caller from finance settings —
 * never a literal, since the admin configures it. */
export const emptyStudioPodSummary = (symbol = ''): StudioPodSummary => ({
  scope_count: 0,
  total: 0,
  upcoming: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
  total_spots: 0,
  filled_spots: 0,
  total_attendees: 0,
  fill_rate: 0,
  next_pod_date_time: null,
  total_revenue: 0,
  currency_symbol: symbol,
});

interface Tally {
  counts: Record<'upcoming' | 'ongoing' | 'completed' | 'cancelled', number>;
  total_spots: number;
  filled_spots: number;
  total_attendees: number;
  /** Start of the soonest upcoming pod, ms. */
  next_at: number | null;
}

/**
 * Fold one pod in. A cancelled pod counts in `counts` and nowhere else: its
 * spots were never sold, so it must not dilute capacity, head-count or fill.
 */
function fold(tally: Tally, pod: any, now: number): void {
  const bucket = bucketForPod(pod, now);
  tally.counts[bucket] += 1;
  if (bucket === 'cancelled') return;
  tally.total_spots += pod.no_of_spots ?? 0;
  tally.filled_spots += podSeatsTaken(pod);
  tally.total_attendees += pod.pod_attendees?.length ?? 0;
  if (bucket !== 'upcoming') return;
  // A pod with an unreadable date buckets as upcoming (bucketForPod's fallback)
  // but must never become `next` — NaN would blow up toISOString().
  const start = +new Date(pod.pod_date_time);
  if (Number.isNaN(start)) return;
  if (tally.next_at === null || start < tally.next_at) tally.next_at = start;
}

/**
 * @param filter  An already-scoped Mongo filter over pods.
 * @param scopeCount How many clubs / venues that filter covers.
 */
export async function buildStudioPodSummary(
  filter: FilterQuery<any>,
  scopeCount: number,
): Promise<StudioPodSummary> {
  const settings = await getFinanceSettings();
  const fallbackSymbol = settings.currency_symbol;
  if (scopeCount === 0) return emptyStudioPodSummary(fallbackSymbol);

  const pods = await PodModel.find(filter)
    .setOptions({ includeDeleted: true })
    .select('_id pod_date_time pod_end_date_time completed_at deleted_at no_of_spots pod_attendees extra_seats')
    .lean();

  const now = Date.now();
  const tally: Tally = {
    counts: { upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 },
    total_spots: 0,
    filled_spots: 0,
    total_attendees: 0,
    next_at: null,
  };
  for (const pod of pods as any[]) fold(tally, pod, now);

  // A cancelled pod's payments were refunded, so revenue counts live pods only.
  const livePodIds = (pods as any[]).filter((p) => !p.deleted_at).map((p) => p._id);
  const payments = await PaymentModel.find({ pod_id: { $in: livePodIds }, status: 'SUCCESS' })
    .select('total currency_symbol')
    .lean();
  const total_revenue = (payments as any[]).reduce((sum, p) => sum + (p.total ?? 0), 0);

  return {
    scope_count: scopeCount,
    total: pods.length,
    upcoming: tally.counts.upcoming,
    ongoing: tally.counts.ongoing,
    completed: tally.counts.completed,
    cancelled: tally.counts.cancelled,
    total_spots: tally.total_spots,
    filled_spots: tally.filled_spots,
    total_attendees: tally.total_attendees,
    fill_rate: tally.total_spots > 0 ? tally.filled_spots / tally.total_spots : 0,
    next_pod_date_time: tally.next_at === null ? null : new Date(tally.next_at).toISOString(),
    total_revenue,
    currency_symbol: (payments[0] as any)?.currency_symbol || fallbackSymbol,
  };
}
