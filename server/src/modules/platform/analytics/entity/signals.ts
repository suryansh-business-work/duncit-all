import { TicketModel } from '@modules/pods/ticket/ticket.model';
import { BouncerFeedbackModel } from '@modules/support/bouncer/bouncer.model';
import { dayKeyExpr, inRange } from './window';
import { countMap, mean } from './shapes';

/**
 * Two signals about the people who run pods, read the same way for hosts and
 * club admins: what guests scored them, and how attendance got recorded.
 */

export interface AspectRatings {
  sum: number;
  count: number;
  average: number;
  /** Star value ('1'..'5') → how many guests gave it. */
  stars: Map<string, number>;
}

/** Guests' scores for one part of a pod (HOST, CLUB_ADMIN…) given in the period. */
export async function aspectRatings(aspect: string, from: Date, to: Date): Promise<AspectRatings> {
  const rows = await BouncerFeedbackModel.aggregate<{ _id: number; count: number }>([
    { $match: { created_at: inRange(from, to), 'ratings.aspect': aspect } },
    { $unwind: '$ratings' },
    { $match: { 'ratings.aspect': aspect } },
    { $group: { _id: '$ratings.rating', count: { $sum: 1 } } },
  ]);
  const count = rows.reduce((total, row) => total + row.count, 0);
  const sum = rows.reduce((total, row) => total + row._id * row.count, 0);
  return { sum, count, average: mean(sum, count), stars: countMap(rows) };
}

/** Attendance marks recorded in the period, by how they were made. */
export async function markCounts(from: Date, to: Date): Promise<Map<string, number>> {
  const rows = await TicketModel.aggregate<{ _id: string; count: number }>([
    { $match: { status: 'CHECKED_IN', checked_in_at: inRange(from, to), checked_in_method: { $ne: null } } },
    { $group: { _id: '$checked_in_method', count: { $sum: 1 } } },
  ]);
  return countMap(rows);
}

/** Per-day attendance marks of one method — the trend line behind a tile. */
export const markDays = (method: string, from: Date, to: Date, zone: string) =>
  TicketModel.aggregate<{ _id: string; value: number }>([
    { $match: { checked_in_method: method, checked_in_at: inRange(from, to) } },
    { $group: { _id: dayKeyExpr('checked_in_at', zone), value: { $sum: 1 } } },
  ]);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Average days between two dates across rows that have both. */
export function meanDays<T>(rows: readonly T[], startOf: (row: T) => Date | null, endOf: (row: T) => Date | null) {
  let total = 0;
  let count = 0;
  for (const row of rows) {
    const start = startOf(row);
    const end = endOf(row);
    if (!start || !end) continue;
    total += Math.max(0, end.getTime() - start.getTime()) / DAY_MS;
    count += 1;
  }
  return mean(total, count);
}

/** Rows whose date falls inside [from, to). */
export const within = <T>(rows: readonly T[], dateOf: (row: T) => Date | null, from: Date, to: Date) =>
  rows.filter((row) => {
    const date = dateOf(row);
    return date !== null && date >= from && date < to;
  });
