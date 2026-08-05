import { Types } from 'mongoose';
import { PodModel } from './pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { BouncerFeedbackModel, type IBouncerAspectRating } from '@modules/support/bouncer/bouncer.model';
import { summarize } from '@modules/support/bouncer/bouncer.feedback';

/**
 * The Pods dashboard: one read that answers "how are pods doing right now?" —
 * how many there are and in what state, how full they get, what they took, and
 * what guests thought of them.
 *
 * The counts are LIVE (a pod is upcoming or it is not); the money, the ratings
 * and the trend are windowed, because those only mean something over a period.
 */

const LIVE = { deleted_at: null } as const;

/** A pod list row — the same shape wherever the dashboard names pods. */
interface DashboardPod {
  id: string;
  pod_id: string;
  title: string;
  starts_at: string | null;
  spots: number;
  filled: number;
  rating_average: number | null;
  rating_count: number;
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const seatsOf = (pod: { pod_attendees?: unknown[]; extra_seats?: number }) =>
  (pod.pod_attendees?.length ?? 0) + (pod.extra_seats ?? 0);

function toDashboardPod(
  pod: any,
  rating?: { average: number; count: number } | null
): DashboardPod {
  return {
    id: String(pod._id),
    pod_id: pod.pod_id ?? '',
    title: pod.pod_title ?? '',
    starts_at: pod.pod_date_time?.toISOString?.() ?? null,
    spots: pod.no_of_spots ?? 0,
    filled: seatsOf(pod),
    rating_average: rating ? round1(rating.average) : null,
    rating_count: rating?.count ?? 0,
  };
}

async function countsNow(now: Date) {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const [total, upcoming, completed, cancelled, awaiting_venue, live_today] = await Promise.all([
    PodModel.countDocuments(LIVE),
    PodModel.countDocuments({ ...LIVE, completed_at: null, pod_date_time: { $gte: now } }),
    PodModel.countDocuments({ ...LIVE, completed_at: { $ne: null } }),
    PodModel.countDocuments({ deleted_at: { $ne: null } }),
    PodModel.countDocuments({ ...LIVE, venue_approval_status: 'PENDING' }),
    PodModel.countDocuments({ ...LIVE, pod_date_time: { $gte: now, $lte: endOfDay } }),
  ]);
  return { total, upcoming, completed, cancelled, awaiting_venue, live_today };
}

/** How full pods get: seats sold against seats offered, over the window. */
async function seatsSince(from: Date) {
  const [row] = await PodModel.aggregate<{ spots_total: number; seats_filled: number }>([
    { $match: { ...LIVE, pod_date_time: { $gte: from } } },
    {
      $group: {
        _id: null,
        spots_total: { $sum: { $ifNull: ['$no_of_spots', 0] } },
        seats_filled: {
          $sum: {
            $add: [
              { $size: { $ifNull: ['$pod_attendees', []] } },
              { $ifNull: ['$extra_seats', 0] },
            ],
          },
        },
      },
    },
  ]);
  const spots_total = row?.spots_total ?? 0;
  const seats_filled = row?.seats_filled ?? 0;
  return {
    spots_total,
    seats_filled,
    occupancy_pct: spots_total > 0 ? round1((seats_filled / spots_total) * 100) : 0,
  };
}

/** What pods took in the window — settled money only, refunds shown separately. */
async function moneySince(from: Date) {
  const rows = await PaymentModel.aggregate<{ _id: string; total: number; count: number }>([
    {
      $match: {
        target_type: 'POD',
        pod_id: { $ne: null },
        status: { $in: ['SUCCESS', 'REFUNDED'] },
        created_at: { $gte: from },
      },
    },
    { $group: { _id: '$status', total: { $sum: '$total' }, count: { $sum: 1 } } },
  ]);
  const paid = rows.find((r) => r._id === 'SUCCESS');
  const refunded = rows.find((r) => r._id === 'REFUNDED');
  const revenue_total = Math.round(paid?.total ?? 0);
  const payments_count = paid?.count ?? 0;
  return {
    revenue_total,
    payments_count,
    refunded_total: Math.round(refunded?.total ?? 0),
    average_ticket: payments_count > 0 ? round1(revenue_total / payments_count) : 0,
  };
}

/** Pods created per day — the trend line, with empty days present as zeroes. */
async function trendSince(from: Date, days: number) {
  const rows = await PodModel.aggregate<{ _id: string; count: number }>([
    { $match: { created_at: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDate = new Map(rows.map((row) => [row._id, row.count]));
  const out: Array<{ date: string; count: number }> = [];
  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(from);
    day.setDate(day.getDate() + offset);
    const date = day.toISOString().slice(0, 10);
    out.push({ date, count: byDate.get(date) ?? 0 });
  }
  return out;
}

/** Every pod that has been rated, best and worst first. */
async function ratedPods() {
  const rows = await BouncerFeedbackModel.aggregate<{
    _id: Types.ObjectId;
    average: number;
    count: number;
  }>([
    { $group: { _id: '$pod_id', average: { $avg: '$rating' }, count: { $sum: 1 } } },
    { $sort: { average: -1, count: -1 } },
  ]);
  if (rows.length === 0) return { top: [], attention: [] };

  const best = rows.slice(0, 5);
  const inBest = new Set(best.map((row) => String(row._id)));
  // The worst are only worth surfacing while they are actually poor — a
  // five-pod platform where everything scored 5 has nothing to fix — and never
  // the same pod the list above just called one of the best.
  const worst = rows
    .filter((row) => row.average < 4 && !inBest.has(String(row._id)))
    .slice(-5)
    .reverse();

  const ids = [...best, ...worst].map((row) => row._id);
  const pods = await PodModel.find({ _id: { $in: ids } })
    .select('pod_id pod_title pod_date_time no_of_spots pod_attendees extra_seats')
    .lean();
  const byId = new Map(pods.map((pod) => [String(pod._id), pod]));
  const build = (list: typeof rows) =>
    list
      .map((row) => {
        const pod = byId.get(String(row._id));
        return pod ? toDashboardPod(pod, row) : null;
      })
      .filter((pod): pod is DashboardPod => pod !== null);

  return { top: build(best), attention: build(worst) };
}

/** How guests scored pods in the window, part by part. */
async function ratingsSince(from: Date) {
  const rows = await BouncerFeedbackModel.find({ created_at: { $gte: from } })
    .select('rating ratings')
    .limit(5000)
    .lean();
  const summary = summarize(rows as Array<{ rating: number; ratings?: IBouncerAspectRating[] }>);
  return {
    total: summary.total,
    overall_average: summary.overall_average,
    aspects: summary.aspects,
  };
}

async function nextPods(now: Date) {
  const pods = await PodModel.find({ ...LIVE, pod_date_time: { $gte: now } })
    .sort({ pod_date_time: 1 })
    .limit(6)
    .select('pod_id pod_title pod_date_time no_of_spots pod_attendees extra_seats')
    .lean();
  return pods.map((pod) => toDashboardPod(pod));
}

export const podDashboardService = {
  async load(days = 30) {
    const window = Math.min(365, Math.max(1, Math.round(days)));
    const now = new Date();
    const from = new Date(now.getTime() - (window - 1) * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);

    const [totals, seats, money, ratings, rated, upcoming, created_trend] = await Promise.all([
      countsNow(now),
      seatsSince(from),
      moneySince(from),
      ratingsSince(from),
      ratedPods(),
      nextPods(now),
      trendSince(from, window),
    ]);

    return {
      days: window,
      totals,
      seats,
      money,
      ratings,
      top_rated: rated.top,
      needs_attention: rated.attention,
      upcoming,
      created_trend,
    };
  },
};
