import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { subYears } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { getAppTimeZone } from '@utils/app-time';

/**
 * The period an Analytics console page reports on, and the calendar it is read
 * in.
 *
 * Every windowed number is also computed for a comparison period — the one of
 * the same length immediately before it, or the same dates a year earlier — so
 * a tile can say "up 12%" rather than print a bare figure nobody can judge. Days are cut in the admin's time zone (Admin >
 * Settings), because a pod at 11 pm in Kolkata belongs to that evening, not to
 * the UTC day the container would put it on.
 */

export type AnalyticsGranularity = 'DAY' | 'WEEK' | 'MONTH';

/** What every tile is compared with: the period just before, or the same dates a year earlier. */
export type AnalyticsCompare = 'PREVIOUS' | 'YEAR';

export interface AnalyticsWindow {
  days: number;
  from: Date;
  to: Date;
  /** The comparison period: `[prevFrom, prevTo)`. Loaders read the previous period between these two. */
  prevFrom: Date;
  prevTo: Date;
  compare: AnalyticsCompare;
  /** A location id the page is narrowed to, on the pages that can be; null for every city. */
  city: string | null;
  granularity: AnalyticsGranularity;
  zone: string;
  /** Every bucket in the window, oldest first — a chart's x axis, gaps included. */
  buckets: string[];
}

/** What a reader asked for: a preset length, or a calendar range, plus the comparison and the city. */
export interface PeriodRequest {
  days?: number | null;
  /** `yyyy-MM-dd` in the admin's zone, inclusive — both or neither. */
  from?: string | null;
  to?: string | null;
  compare?: AnalyticsCompare | null;
  city?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_DAYS = 7;
export const MAX_DAYS = 365;
export const DEFAULT_DAYS = 30;
/** A custom range may be as short as a day, and as long as a leap year. */
const MAX_RANGE_DAYS = 366;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

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

const badPeriod = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** A custom range's bounds: the start of `from` and the end of `to` in the zone, never past now. */
function rangeBounds(fromDay: string, toDay: string, zone: string, now: Date): { from: Date; to: Date } {
  if (!ISO_DAY.test(fromDay) || !ISO_DAY.test(toDay)) throw badPeriod('Dates must be written yyyy-MM-dd.');
  const from = fromZonedTime(`${fromDay}T00:00:00`, zone);
  const end = fromZonedTime(`${toDay}T00:00:00`, zone).getTime() + DAY_MS;
  const to = new Date(Math.min(end, now.getTime()));
  if (from >= to) throw badPeriod('The start date must be on or before the end date, and not in the future.');
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) throw badPeriod('A range can cover at most a year.');
  return { from, to };
}

/** The period a page reports on — a preset length ending now, or a calendar range — and its comparison. */
export function resolvePeriod(request: PeriodRequest = {}, now = new Date()): AnalyticsWindow {
  if (request.city && !Types.ObjectId.isValid(request.city)) throw badPeriod('That city is not one Duncit has.');
  const zone = getAppTimeZone();
  let from: Date;
  let to = now;
  if (request.from && request.to) {
    ({ from, to } = rangeBounds(request.from, request.to, zone, now));
  } else {
    const span = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(request.days ?? DEFAULT_DAYS)));
    from = new Date(now.getTime() - span * DAY_MS);
  }
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));
  const compare = request.compare ?? 'PREVIOUS';
  const lastYear = compare === 'YEAR';
  const granularity = granularityFor(days);
  return {
    days,
    from,
    to,
    prevFrom: lastYear ? subYears(from, 1) : new Date(from.getTime() - (to.getTime() - from.getTime())),
    prevTo: lastYear ? subYears(to, 1) : from,
    compare,
    city: request.city || null,
    granularity,
    zone,
    buckets: bucketsBetween(from, to, zone, granularity),
  };
}

/** A preset period of `days` ending now, compared with the one before it. */
export const resolveWindow = (days?: number | null, now = new Date()): AnalyticsWindow =>
  resolvePeriod({ days }, now);

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

/**
 * One number per bucket from the rows that fall in it — an average, a peak,
 * a count of one status. A bucket with no rows reads 0.
 */
export function bucketSeries<T>(
  rows: readonly T[],
  dateOf: (row: T) => Date,
  window: AnalyticsWindow,
  reduce: (inBucket: T[]) => number
): number[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = bucketOfDay(dayKeyIn(dateOf(row), window.zone), window.granularity);
    const inBucket = groups.get(bucket) ?? [];
    inBucket.push(row);
    groups.set(bucket, inBucket);
  }
  return window.buckets.map((bucket) => {
    const inBucket = groups.get(bucket);
    return inBucket ? reduce(inBucket) : 0;
  });
}

export const inRange = (from: Date, to: Date) => ({ $gte: from, $lt: to });

/**
 * A `$match` condition for rows whose `field` falls in the chosen period or in
 * the one it is compared with. Against last year the two are not one range, so
 * a query reading both matches each on its own.
 */
export const inEitherPeriod = (field: string, window: AnalyticsWindow) => ({
  $or: [{ [field]: inRange(window.from, window.to) }, { [field]: inRange(window.prevFrom, window.prevTo) }],
});
