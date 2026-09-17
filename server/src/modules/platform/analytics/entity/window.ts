import { formatInTimeZone } from 'date-fns-tz';
import { getAppTimeZone } from '@utils/app-time';

/**
 * The period an Analytics console page reports on, and the calendar it is read
 * in.
 *
 * Every windowed number is also computed for the period of the same length
 * immediately before it, so a tile can say "up 12%" rather than print a bare
 * figure nobody can judge. Days are cut in the admin's time zone (Admin >
 * Settings), because a pod at 11 pm in Kolkata belongs to that evening, not to
 * the UTC day the container would put it on.
 */

export type AnalyticsGranularity = 'DAY' | 'WEEK' | 'MONTH';

export interface AnalyticsWindow {
  days: number;
  from: Date;
  to: Date;
  /** Start of the equally long period that ends where this one starts. */
  prevFrom: Date;
  granularity: AnalyticsGranularity;
  zone: string;
  /** Every bucket in the window, oldest first — a chart's x axis, gaps included. */
  buckets: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_DAYS = 7;
export const MAX_DAYS = 365;
export const DEFAULT_DAYS = 30;

/** A month of daily bars reads well; a quarter needs weeks; a year needs months. */
function granularityFor(days: number): AnalyticsGranularity {
  if (days <= 31) return 'DAY';
  if (days <= 120) return 'WEEK';
  return 'MONTH';
}

/** The ISO calendar day (`yyyy-MM-dd`) an instant falls on, in the zone. */
export const dayKeyIn = (date: Date, zone: string): string => formatInTimeZone(date, zone, 'yyyy-MM-dd');

/** The bucket a calendar day belongs to: itself, its Monday, or its month's first day. */
export function bucketOfDay(dayKey: string, granularity: AnalyticsGranularity): string {
  if (granularity === 'DAY') return dayKey;
  if (granularity === 'MONTH') return `${dayKey.slice(0, 7)}-01`;
  const day = new Date(`${dayKey}T00:00:00.000Z`);
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

function bucketsBetween(from: Date, to: Date, zone: string, granularity: AnalyticsGranularity) {
  const out = new Set<string>();
  for (let at = from.getTime(); at <= to.getTime(); at += DAY_MS) {
    out.add(bucketOfDay(dayKeyIn(new Date(at), zone), granularity));
  }
  out.add(bucketOfDay(dayKeyIn(to, zone), granularity));
  return [...out];
}

export function resolveWindow(days?: number | null, now = new Date()): AnalyticsWindow {
  const span = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(days ?? DEFAULT_DAYS)));
  const zone = getAppTimeZone();
  const from = new Date(now.getTime() - span * DAY_MS);
  const granularity = granularityFor(span);
  return {
    days: span,
    from,
    to: now,
    prevFrom: new Date(from.getTime() - span * DAY_MS),
    granularity,
    zone,
    buckets: bucketsBetween(from, now, zone, granularity),
  };
}

/** A Mongo expression naming the calendar day a date field falls on, in the zone. */
export const dayKeyExpr = (field: string, zone: string) => ({
  $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: zone },
});

/**
 * Lays per-day totals onto the window's buckets, zeroes included — a day with
 * nothing on it is a real reading, and dropping it would join the line across
 * the gap as if activity had carried on.
 */
export function seriesFromDays(
  rows: ReadonlyArray<{ _id: string; value: number }>,
  window: AnalyticsWindow
): number[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const bucket = bucketOfDay(row._id, window.granularity);
    totals.set(bucket, (totals.get(bucket) ?? 0) + row.value);
  }
  return window.buckets.map((bucket) => totals.get(bucket) ?? 0);
}

/** Rows already in memory as per-day totals, ready for `seriesFromDays`. */
export function dayTotals<T>(
  rows: readonly T[],
  dateOf: (row: T) => Date,
  zone: string,
  valueOf: (row: T) => number = () => 1
): Array<{ _id: string; value: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const day = dayKeyIn(dateOf(row), zone);
    totals.set(day, (totals.get(day) ?? 0) + valueOf(row));
  }
  return [...totals.entries()].map(([_id, value]) => ({ _id, value }));
}

/** A running total that starts from `base` — "how many existed by then". */
export function cumulative(base: number, values: readonly number[]): number[] {
  const out: number[] = [];
  let running = base;
  for (const value of values) {
    running += value;
    out.push(running);
  }
  return out;
}

/** Distinct-id counts per bucket, e.g. "clubs that held a pod that week". */
export function distinctSeries(
  rows: ReadonlyArray<{ day: string; id: string }>,
  window: AnalyticsWindow
): number[] {
  const sets = new Map<string, Set<string>>();
  for (const row of rows) {
    const bucket = bucketOfDay(row.day, window.granularity);
    const set = sets.get(bucket) ?? new Set<string>();
    set.add(row.id);
    sets.set(bucket, set);
  }
  return window.buckets.map((bucket) => sets.get(bucket)?.size ?? 0);
}

export const inRange = (from: Date, to: Date) => ({ $gte: from, $lt: to });
