import type { Types } from 'mongoose';
import { TicketModel } from '@modules/pods/ticket/ticket.model';
import type { TableFilterInput } from '@utils/table-query';

/**
 * Booking-history segments for audience lists — the axis every lifecycle
 * campaign is built on: "booked in the last month", "never booked",
 * "came to 3+ pods". The profile fields could only say when somebody last
 * signed in, which is not the same as when they last came to anything.
 *
 * Read off tickets: one per membership, CANCELLED when the spot was given up,
 * CHECKED_IN once the person was actually there. Each filter resolves to a set
 * of user ids, AND-merged by the caller like every other computed filter.
 */

type IdCondition = { $in?: Types.ObjectId[]; $nin?: Types.ObjectId[] };

/** Fields this module answers. */
export const BOOKING_FIELDS = new Set(['has_booked', 'last_booked_at', 'pods_attended']);

const LIVE_TICKET = { status: { $ne: 'CANCELLED' } };

const date = (raw?: string | null): Date | undefined => {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const count = (raw?: string | null): number | undefined => {
  if (raw == null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined;
};

/** [low, high] out of whichever range op the sidebar used. */
function bounds<T>(f: TableFilterInput, parse: (raw?: string | null) => T | undefined): { lo?: T; hi?: T } {
  if (f.op === 'between') return { lo: parse(f.values?.[0]), hi: parse(f.values?.[1]) };
  if (f.op === 'gte') return { lo: parse(f.value) };
  if (f.op === 'lte') return { hi: parse(f.value) };
  if (f.op === 'eq') return { lo: parse(f.value), hi: parse(f.value) };
  return {};
}

async function bookedIds(): Promise<Types.ObjectId[]> {
  return (await TicketModel.distinct('user_id', LIVE_TICKET)) as unknown as Types.ObjectId[];
}

/** Members whose most recent live booking falls in the range. */
async function lastBookedCondition(f: TableFilterInput): Promise<IdCondition | undefined> {
  const { lo, hi } = bounds(f, date);
  if (!lo && !hi) return undefined;
  const range: Record<string, Date> = {};
  if (lo) range.$gte = lo;
  if (hi) range.$lte = hi;
  const rows = await TicketModel.aggregate<{ _id: Types.ObjectId }>([
    { $match: LIVE_TICKET },
    { $group: { _id: '$user_id', last: { $max: '$created_at' } } },
    { $match: { last: range } },
    { $project: { _id: 1 } },
  ]);
  return { $in: rows.map((row) => row._id) };
}

/**
 * Members who were checked in at a number of distinct pods in the range. A
 * range that admits zero ("at most 2") must keep everybody who never came at
 * all, so it is expressed as excluding those who came MORE than the top.
 */
async function attendedCondition(f: TableFilterInput): Promise<IdCondition | undefined> {
  const { lo, hi } = bounds(f, count);
  if (lo === undefined && hi === undefined) return undefined;
  const counted = (match: Record<string, number>) =>
    TicketModel.aggregate<{ _id: Types.ObjectId }>([
      { $match: { status: 'CHECKED_IN' } },
      { $group: { _id: '$user_id', pods: { $addToSet: '$pod_id' } } },
      { $project: { n: { $size: '$pods' } } },
      { $match: { n: match } },
      { $project: { _id: 1 } },
    ]);
  if (!lo) {
    const over = await counted({ $gt: hi as number });
    return { $nin: over.map((row) => row._id) };
  }
  const range: Record<string, number> = { $gte: lo };
  if (hi !== undefined) range.$lte = hi;
  const inRange = await counted(range);
  return { $in: inRange.map((row) => row._id) };
}

/** The id condition one booking filter calls for, or undefined to ignore it. */
export async function bookingCondition(f: TableFilterInput): Promise<IdCondition | undefined> {
  if (f.field === 'has_booked') {
    if (f.op === 'is_true') return { $in: await bookedIds() };
    if (f.op === 'is_false') return { $nin: await bookedIds() };
    return undefined;
  }
  if (f.field === 'last_booked_at') return lastBookedCondition(f);
  return attendedCondition(f);
}
