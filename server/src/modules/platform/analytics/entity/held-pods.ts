import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { BouncerFeedbackModel } from '@modules/support/bouncer/bouncer.model';
import { inRange } from './window';
import { mean, pct } from './shapes';

/**
 * "Pods held in the period" — the set every activity number is read from.
 *
 * A pod is HELD when its start time falls inside the period and has already
 * passed; a cancelled pod is soft-deleted and so never held (the model's read
 * hook drops it). Clubs, club admins and hosts are all judged by the pods they
 * held, so this is loaded once per page and grouped in memory.
 */

export interface HeldPod {
  id: string;
  club_id: string;
  host_ids: string[];
  location_id: string | null;
  starts_at: Date;
  spots: number;
  /** Seats taken: one per attendee plus the extra seats their bookings hold. */
  seats: number;
  amount: number;
  mode: string;
  type: string;
}

interface RawPod {
  _id: Types.ObjectId;
  club_id: Types.ObjectId;
  pod_hosts_id?: Types.ObjectId[];
  location_id?: Types.ObjectId | null;
  pod_date_time: Date;
  no_of_spots?: number;
  pod_attendees?: unknown[];
  extra_seats?: number;
  pod_amount?: number;
  pod_mode?: string;
  pod_type?: string;
}

export async function loadHeldPods(from: Date, to: Date): Promise<HeldPod[]> {
  const pods = await PodModel.find({ pod_date_time: inRange(from, to) })
    .select('club_id pod_hosts_id location_id pod_date_time no_of_spots pod_attendees extra_seats pod_amount pod_mode pod_type')
    .lean<RawPod[]>();
  return pods.map((pod) => ({
    id: pod._id.toHexString(),
    club_id: pod.club_id.toHexString(),
    host_ids: (pod.pod_hosts_id ?? []).map((id) => id.toHexString()),
    location_id: pod.location_id?.toHexString() ?? null,
    starts_at: pod.pod_date_time,
    spots: pod.no_of_spots ?? 0,
    seats: (pod.pod_attendees?.length ?? 0) + (pod.extra_seats ?? 0),
    amount: pod.pod_amount ?? 0,
    mode: pod.pod_mode ?? 'PHYSICAL',
    type: pod.pod_type ?? 'PAID',
  }));
}

/** What happened at a held pod: the money, the door and the guests' scores. */
export interface PodOutcome {
  revenue: number;
  /** Seats on live tickets, and how many of them were marked present. */
  admitted: number;
  checked_in: number;
  forced: number;
  host_scans: number;
  host_manual: number;
  rating_sum: number;
  rating_count: number;
  host_rating_sum: number;
  host_rating_count: number;
  admin_rating_sum: number;
  admin_rating_count: number;
}

const blankOutcome = (): PodOutcome => ({
  revenue: 0,
  admitted: 0,
  checked_in: 0,
  forced: 0,
  host_scans: 0,
  host_manual: 0,
  rating_sum: 0,
  rating_count: 0,
  host_rating_sum: 0,
  host_rating_count: 0,
  admin_rating_sum: 0,
  admin_rating_count: 0,
});

interface OutcomeRow {
  _id: Types.ObjectId;
  [field: string]: unknown;
}

const ofMethod = (method: string) => ({ $sum: { $cond: [{ $eq: ['$checked_in_method', method] }, 1, 0] } });
const aspectOnly = (aspect: string) => ({
  $filter: { input: { $ifNull: ['$ratings', []] }, cond: { $eq: ['$$this.aspect', aspect] } },
});

async function outcomeRows(ids: Types.ObjectId[]) {
  return Promise.all([
    PaymentModel.aggregate<OutcomeRow>([
      { $match: { target_type: 'POD', status: 'SUCCESS', pod_id: { $in: ids } } },
      { $group: { _id: '$pod_id', revenue: { $sum: '$total' } } },
    ]),
    TicketModel.aggregate<OutcomeRow>([
      { $match: { pod_id: { $in: ids }, status: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: '$pod_id',
          admitted: { $sum: { $ifNull: ['$seats', 1] } },
          checked_in: { $sum: { $cond: [{ $eq: ['$status', 'CHECKED_IN'] }, { $ifNull: ['$seats', 1] }, 0] } },
          forced: ofMethod('CLUB_ADMIN_FORCE'),
          host_scans: ofMethod('HOST_SCAN'),
          host_manual: ofMethod('HOST_MANUAL'),
        },
      },
    ]),
    BouncerFeedbackModel.aggregate<OutcomeRow>([
      { $match: { pod_id: { $in: ids } } },
      { $project: { pod_id: 1, rating: 1, host: aspectOnly('HOST'), admin: aspectOnly('CLUB_ADMIN') } },
      {
        $group: {
          _id: '$pod_id',
          rating_sum: { $sum: '$rating' },
          rating_count: { $sum: 1 },
          host_rating_sum: { $sum: { $sum: '$host.rating' } },
          host_rating_count: { $sum: { $size: '$host' } },
          admin_rating_sum: { $sum: { $sum: '$admin.rating' } },
          admin_rating_count: { $sum: { $size: '$admin' } },
        },
      },
    ]),
  ]);
}

export async function loadOutcomes(pods: readonly HeldPod[]): Promise<Map<string, PodOutcome>> {
  const out = new Map<string, PodOutcome>(pods.map((pod) => [pod.id, blankOutcome()]));
  if (pods.length === 0) return out;
  const ids = pods.map((pod) => new Types.ObjectId(pod.id));
  const [payments, tickets, ratings] = await outcomeRows(ids);
  for (const row of [...payments, ...tickets, ...ratings]) {
    const outcome = out.get(row._id.toHexString());
    if (!outcome) continue;
    for (const [field, value] of Object.entries(row)) {
      if (field in outcome) outcome[field as keyof PodOutcome] = Number(value) || 0;
    }
  }
  return out;
}

/** Several pods' outcomes and seats, summed — one club, one host, one admin. */
export interface PodTotals extends PodOutcome {
  pods: number;
  spots: number;
  seats: number;
}

export function sumPods(pods: readonly HeldPod[], outcomes: ReadonlyMap<string, PodOutcome>): PodTotals {
  const totals: PodTotals = { ...blankOutcome(), pods: 0, spots: 0, seats: 0 };
  for (const pod of pods) {
    totals.pods += 1;
    totals.spots += pod.spots;
    totals.seats += pod.seats;
    const outcome = outcomes.get(pod.id);
    if (!outcome) continue;
    for (const field of Object.keys(outcome) as Array<keyof PodOutcome>) {
      totals[field] += outcome[field];
    }
  }
  return totals;
}

/** The ranking columns every people/club leaderboard shares, in column order. */
export const rankingValues = (totals: PodTotals, rating: { sum: number; count: number }) => [
  totals.pods,
  totals.seats,
  pct(totals.seats, totals.spots),
  Math.round(totals.revenue),
  pct(totals.checked_in, totals.admitted),
  rating.count > 0 ? mean(rating.sum, rating.count) : null,
];

export const RANKING_COLUMNS = [
  { key: 'pods_held', format: 'COUNT' },
  { key: 'seats_filled', format: 'COUNT' },
  { key: 'fill_rate', format: 'PERCENT' },
  { key: 'revenue', format: 'CURRENCY' },
  { key: 'attendance_rate', format: 'PERCENT' },
  { key: 'avg_rating', format: 'RATING' },
] as const;

/** Groups pods under every key `keysOf` names — a pod with two hosts counts for both. */
export function groupPods(
  pods: readonly HeldPod[],
  keysOf: (pod: HeldPod) => readonly string[]
): Map<string, HeldPod[]> {
  const groups = new Map<string, HeldPod[]>();
  for (const pod of pods) {
    for (const key of keysOf(pod)) {
      const list = groups.get(key) ?? [];
      list.push(pod);
      groups.set(key, list);
    }
  }
  return groups;
}
