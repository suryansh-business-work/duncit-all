import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { BouncerFeedbackModel } from '@modules/support/bouncer/bouncer.model';
import { dayKeyExpr, inRange } from './window';
import { loadHeldPods, loadOutcomes, sumPods, type HeldPod, type PodTotals } from './held-pods';

/**
 * Everything the Pods page reads for ONE period. The page loads it twice —
 * the chosen period and the one before — so every tile can show its change.
 */

export interface BookingRow {
  pod_id: Types.ObjectId;
  user_id: Types.ObjectId;
  joined_at: Date;
  seats?: number;
  source?: string;
}

export interface PodPeriod {
  held: HeldPod[];
  totals: PodTotals;
  bookings: BookingRow[];
  created: number;
  cancelled: number;
  backouts: number;
  revenue: number;
  payments: number;
  rating_sum: number;
  rating_count: number;
  unique_guests: number;
  returning_guests: number;
}

/** Every booking made in the period, whatever became of it later. */
const loadBookings = (from: Date, to: Date) =>
  PodMemberModel.find({ joined_at: inRange(from, to) })
    .select('pod_id user_id joined_at seats source')
    .lean<BookingRow[]>();

/** Guests who booked in the period, and how many of them had booked before it. */
async function guestCounts(bookings: readonly BookingRow[], from: Date) {
  const ids = [...new Set(bookings.map((row) => row.user_id.toHexString()))];
  if (ids.length === 0) return { unique: 0, returning: 0 };
  const returning = await PodMemberModel.distinct('user_id', {
    user_id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    joined_at: { $lt: from },
  });
  return { unique: ids.length, returning: returning.length };
}

interface SumRow {
  total: number;
  count: number;
}

const firstSum = (rows: SumRow[]) => rows[0] ?? { total: 0, count: 0 };

export async function loadPodPeriod(from: Date, to: Date): Promise<PodPeriod> {
  const [held, bookings, created, cancelled, backouts, money, ratings] = await Promise.all([
    loadHeldPods(from, to),
    loadBookings(from, to),
    // Created counts every pod made in the period, including ones cancelled since.
    PodModel.countDocuments({ created_at: inRange(from, to) }).setOptions({ includeDeleted: true }),
    PodModel.countDocuments({ deleted_at: inRange(from, to) }),
    PodMemberModel.countDocuments({ backed_out_at: inRange(from, to) }),
    PaymentModel.aggregate<SumRow>([
      { $match: { target_type: 'POD', status: 'SUCCESS', created_at: inRange(from, to) } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    BouncerFeedbackModel.aggregate<SumRow>([
      { $match: { created_at: inRange(from, to) } },
      { $group: { _id: null, total: { $sum: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);
  const [outcomes, guests] = await Promise.all([loadOutcomes(held), guestCounts(bookings, from)]);
  const paid = firstSum(money);
  const rated = firstSum(ratings);
  return {
    held,
    totals: sumPods(held, outcomes),
    bookings,
    created,
    cancelled,
    backouts,
    revenue: Math.round(paid.total),
    payments: paid.count,
    rating_sum: rated.total,
    rating_count: rated.count,
    unique_guests: guests.unique,
    returning_guests: guests.returning,
  };
}

export interface DayRow {
  _id: string;
  value: number;
}

/** Per-day totals the trends need beyond what the period rows already hold. */
export async function loadPodDays(from: Date, to: Date, zone: string) {
  const [cancelled, backouts, revenue] = await Promise.all([
    PodModel.aggregate<DayRow>([
      { $match: { deleted_at: inRange(from, to) } },
      { $group: { _id: dayKeyExpr('deleted_at', zone), value: { $sum: 1 } } },
    ]).option({ includeDeleted: true }),
    PodMemberModel.aggregate<DayRow>([
      { $match: { backed_out_at: inRange(from, to) } },
      { $group: { _id: dayKeyExpr('backed_out_at', zone), value: { $sum: 1 } } },
    ]),
    PaymentModel.aggregate<DayRow>([
      { $match: { target_type: 'POD', status: 'SUCCESS', created_at: inRange(from, to) } },
      { $group: { _id: dayKeyExpr('created_at', zone), value: { $sum: '$total' } } },
    ]),
  ]);
  return { cancelled, backouts, revenue };
}
