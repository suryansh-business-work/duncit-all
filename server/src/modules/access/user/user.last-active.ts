/**
 * The last day the app saw an account — the "Last active" column in Admin >
 * Users.
 *
 * Read from the daily presence pings (`ActiveUserPing`, one row per device,
 * day and category), the same record the Users analytics count activity from.
 * A sign-in is not activity on its own: an account that signed in once and
 * never opened the app again has no ping, and reads as never active.
 */
import { Types } from 'mongoose';
import { ActiveUserPingModel } from '@modules/platform/analytics/activeUser.model';
import { loadOne, type CacheCarrier } from '@utils/request-cache';

/** The latest ping day (yyyy-MM-dd) per account. One query for the whole page. */
async function fetchLastActive(ids: string[]): Promise<Map<string, string>> {
  const valid = ids.filter((id) => Types.ObjectId.isValid(id));
  if (valid.length === 0) return new Map();
  const rows = await ActiveUserPingModel.aggregate<{ _id: Types.ObjectId; day: string }>([
    { $match: { user_id: { $in: valid.map((id) => new Types.ObjectId(id)) } } },
    { $group: { _id: '$user_id', day: { $max: '$date_ymd' } } },
  ]);
  return new Map(rows.map((row) => [row._id.toHexString(), row.day]));
}

/** The last calendar day (UTC, yyyy-MM-dd) the app saw this account; null when never. */
export function loadLastActiveOn(carrier: CacheCarrier, userId: string): Promise<string | null> {
  return loadOne<string>(carrier, 'userLastActive', userId, fetchLastActive);
}
