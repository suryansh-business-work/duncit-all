import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ActiveUserPingModel } from '../activeUser.model';
import { inRange } from './window';

/**
 * The people a Funnel & Retention page follows: everyone who signed up in a
 * period, and what each of them has done since — on how many days the app saw
 * them, when they first booked and how many times. "Since" runs to now, so an
 * older cohort has had longer to convert; the page says so in its hints.
 */

export interface CohortMember {
  id: string;
  signedUpAt: Date;
  /** Different calendar days the app saw them signed in. */
  activeDays: number;
  firstBookingAt: Date | null;
  /** Seats they joined pods with, backed-out ones included — a booking was still made. */
  bookings: number;
}

interface UserRow {
  _id: Types.ObjectId;
  metadata?: { created_at?: Date };
}

export async function loadCohort(from: Date, to: Date): Promise<CohortMember[]> {
  const users = await UserModel.find({ 'metadata.created_at': inRange(from, to) })
    .select('_id metadata.created_at')
    .lean<UserRow[]>();
  if (users.length === 0) return [];
  const ids = users.map((user) => user._id);
  const [pings, bookings] = await Promise.all([
    ActiveUserPingModel.aggregate<{ _id: Types.ObjectId; days: number }>([
      { $match: { user_id: { $in: ids } } },
      { $group: { _id: { user: '$user_id', day: '$date_ymd' } } },
      { $group: { _id: '$_id.user', days: { $sum: 1 } } },
    ]),
    PodMemberModel.aggregate<{ _id: Types.ObjectId; first: Date; count: number }>([
      { $match: { user_id: { $in: ids } } },
      { $group: { _id: '$user_id', first: { $min: '$joined_at' }, count: { $sum: 1 } } },
    ]),
  ]);
  const daysBy = new Map(pings.map((row) => [row._id.toHexString(), row.days]));
  const bookingsBy = new Map(bookings.map((row) => [row._id.toHexString(), row]));
  return users.map((user) => {
    const id = user._id.toHexString();
    const booked = bookingsBy.get(id);
    return {
      id,
      signedUpAt: user.metadata?.created_at ?? from,
      activeDays: daysBy.get(id) ?? 0,
      firstBookingAt: booked?.first ?? null,
      bookings: booked?.count ?? 0,
    };
  });
}

/** Each member's active calendar days (`yyyy-MM-dd`, UTC like the pings) — for the weekly retention table. */
export async function activeDaysOf(ids: readonly string[], since: Date): Promise<Map<string, string[]>> {
  if (ids.length === 0) return new Map();
  const rows = await ActiveUserPingModel.aggregate<{ _id: Types.ObjectId; days: string[] }>([
    {
      $match: {
        user_id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        date_ymd: { $gte: since.toISOString().slice(0, 10) },
      },
    },
    { $group: { _id: '$user_id', days: { $addToSet: '$date_ymd' } } },
  ]);
  return new Map(rows.map((row) => [row._id.toHexString(), row.days]));
}
