import { Types } from 'mongoose';
import { ActiveUserPingModel } from '../activeUser.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { UserModel } from '@modules/access/user/user.model';
import { dayKeyExpr, inRange, type AnalyticsGranularity } from './window';

/**
 * What the Users page reads. Activity comes from the app's daily presence
 * pings (`ActiveUserPing` — one row per device, day and category), which are
 * already day-bucketed on the calendar day the ping landed, so everything
 * here groups on that stored `date_ymd` rather than re-cutting timestamps.
 */

/** Live accounts — a deleted account is soft-deleted, never removed. */
export const LIVE_USERS = { 'metadata.deleted_at': null } as const;

const ymd = (date: Date) => date.toISOString().slice(0, 10);

/** Pings between two instants, by their stored calendar day. */
const pingDays = (from: Date, to: Date) => ({ date_ymd: { $gte: ymd(from), $lt: ymd(to) } });

/** Signed-in users seen in the period, each with how many different days they were seen. */
export async function activeUserDays(from: Date, to: Date): Promise<Map<string, number>> {
  const rows = await ActiveUserPingModel.aggregate<{ _id: Types.ObjectId; days: number }>([
    { $match: { ...pingDays(from, to), user_id: { $ne: null } } },
    { $group: { _id: { user: '$user_id', day: '$date_ymd' } } },
    { $group: { _id: '$_id.user', days: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toHexString(), row.days]));
}

/** Devices seen in the period — signed-out visitors included. */
export async function activeDevices(from: Date, to: Date): Promise<number> {
  const [row] = await ActiveUserPingModel.aggregate<{ devices: number }>([
    { $match: pingDays(from, to) },
    { $group: { _id: '$device_id' } },
    { $count: 'devices' },
  ]);
  return row?.devices ?? 0;
}

/** The average number of signed-in users seen per day of the period. */
export async function averageDailyUsers(from: Date, to: Date, days: number): Promise<number> {
  const [row] = await ActiveUserPingModel.aggregate<{ total: number }>([
    { $match: { ...pingDays(from, to), user_id: { $ne: null } } },
    { $group: { _id: { user: '$user_id', day: '$date_ymd' } } },
    { $group: { _id: null, total: { $sum: 1 } } },
  ]);
  return days > 0 ? Math.round(((row?.total ?? 0) / days) * 10) / 10 : 0;
}

/**
 * The bucket a stored `yyyy-MM-dd` belongs to, as a Mongo expression: the day
 * itself, its Monday, or its month's first day. Distinct people per week or
 * month cannot be summed from daily counts, so the bucket is cut in the query.
 */
function pingBucketExpr(granularity: AnalyticsGranularity) {
  if (granularity === 'DAY') return '$date_ymd';
  if (granularity === 'MONTH') return { $concat: [{ $substrBytes: ['$date_ymd', 0, 7] }, '-01'] };
  return {
    $let: {
      vars: { day: { $dateFromString: { dateString: '$date_ymd' } } },
      in: {
        $dateToString: {
          format: '%Y-%m-%d',
          // $dayOfWeek is 1 for Sunday; this is how many days back Monday was.
          date: { $subtract: ['$$day', { $multiply: [{ $mod: [{ $add: [{ $dayOfWeek: '$$day' }, 5] }, 7] }, 86_400_000] }] },
        },
      },
    },
  };
}

/**
 * Distinct signed-in users (or devices) per bucket, keyed by the bucket's first
 * day — the same keys the window's buckets use, so it feeds `seriesFromDays`.
 */
export function distinctPerBucket(
  from: Date,
  to: Date,
  granularity: AnalyticsGranularity,
  field: 'user_id' | 'device_id'
) {
  const signedIn = field === 'user_id' ? { user_id: { $ne: null } } : {};
  return ActiveUserPingModel.aggregate<{ _id: string; value: number }>([
    { $match: { ...pingDays(from, to), ...signedIn } },
    { $group: { _id: { bucket: pingBucketExpr(granularity), id: `$${field}` } } },
    { $group: { _id: '$_id.bucket', value: { $sum: 1 } } },
  ]);
}

/** Everyone who booked a seat in the period. */
export async function bookerIds(from: Date, to: Date): Promise<Set<string>> {
  const ids: Types.ObjectId[] = await PodMemberModel.distinct('user_id', { joined_at: inRange(from, to) });
  return new Set(ids.map((id) => id.toHexString()));
}

/** Accounts created in the period. */
export async function signupIds(from: Date, to: Date): Promise<string[]> {
  const rows = await UserModel.find({ 'metadata.created_at': inRange(from, to) })
    .select('_id')
    .lean<Array<{ _id: Types.ObjectId }>>();
  return rows.map((row) => row._id.toHexString());
}

/** Sign-ups per calendar day, in the admin's zone. */
export const signupDays = (from: Date, to: Date, zone: string) =>
  UserModel.aggregate<{ _id: string; value: number }>([
    { $match: { 'metadata.created_at': inRange(from, to) } },
    { $group: { _id: dayKeyExpr('metadata.created_at', zone), value: { $sum: 1 } } },
  ]);
