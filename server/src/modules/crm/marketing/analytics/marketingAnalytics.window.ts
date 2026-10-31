import { GraphQLError } from 'graphql';
import { addDays, format, isValid, parseISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { getAppTimeZone } from '@utils/app-time';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../social/social.types';

/**
 * The window every Marketing › Analytics page reads: two calendar days in the
 * admin's zone (Admin > Settings), both included, and the networks to count.
 *
 * Days are the marketer's, not the container's: "1 Oct" runs from midnight in
 * Kolkata, so a post at 00:30 IST on the 1st is October's even though it is
 * still 30 September in UTC.
 */
export interface MarketingAnalyticsInput {
  from: string;
  to: string;
  platforms?: readonly string[] | null;
}

export interface AnalyticsWindow {
  /** The first day, as asked — `yyyy-MM-dd`. */
  from: string;
  /** The last day, as asked — `yyyy-MM-dd`. */
  to: string;
  /** Midnight at the start of `from`, in the admin's zone. Inclusive. */
  start: Date;
  /** Midnight after `to`, in the admin's zone. Exclusive. */
  end: Date;
  /** Every day of the window, oldest first. */
  days: string[];
  zone: string;
  /** The networks asked for; empty means every network. */
  platforms: SocialPlatform[];
}

/** A year and a day: wide enough for a year-on-year read, narrow enough that one request stays cheap. */
export const MAX_WINDOW_DAYS = 366;

const DAY_KEY = 'yyyy-MM-dd';

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

/** A calendar day, read at noon so no zone offset can push it into the next or previous day. */
function calendarDay(value: string, field: string): Date {
  const day = parseISO(`${value}T12:00:00`);
  if (!isValid(day) || format(day, DAY_KEY) !== value) badInput(`${field} must be a day written yyyy-MM-dd.`);
  return day;
}

function platformsOf(values: readonly string[] | null | undefined): SocialPlatform[] {
  const isPlatform = (value: string): value is SocialPlatform => SOCIAL_PLATFORMS.some((platform) => platform === value);
  const asked = [...new Set(values ?? [])];
  const unknown = asked.filter((value) => !isPlatform(value));
  if (unknown.length > 0) badInput(`Unknown network: ${unknown.join(', ')}.`);
  return asked.filter(isPlatform);
}

/** The input checked and turned into instants; a window the pages could never ask for is refused, not clamped. */
export function windowOf(input: MarketingAnalyticsInput): AnalyticsWindow {
  const first = calendarDay(input.from, 'from');
  const last = calendarDay(input.to, 'to');
  if (last < first) badInput('The window ends before it starts.');
  const days: string[] = [];
  for (let day = first; day <= last; day = addDays(day, 1)) days.push(format(day, DAY_KEY));
  if (days.length > MAX_WINDOW_DAYS) badInput(`Pick at most ${MAX_WINDOW_DAYS} days.`);
  const zone = getAppTimeZone();
  return {
    from: input.from,
    to: input.to,
    start: fromZonedTime(`${input.from}T00:00:00`, zone),
    end: fromZonedTime(`${format(addDays(last, 1), DAY_KEY)}T00:00:00`, zone),
    days,
    zone,
    platforms: platformsOf(input.platforms),
  };
}

/** A Mongo range over the window. */
export const inWindow = (window: AnalyticsWindow) => ({ $gte: window.start, $lt: window.end });

/** Only the asked networks, or every network when none was asked. */
export const platformMatch = (window: AnalyticsWindow, field = 'platform'): Record<string, unknown> =>
  window.platforms.length > 0 ? { [field]: { $in: window.platforms } } : {};

/** An instant's day in the admin's zone, as an aggregation expression. */
export const dayOf = (window: AnalyticsWindow, field: string) => ({
  $dateToString: { format: '%Y-%m-%d', date: field, timezone: window.zone },
});

/** A share of a whole, as a percentage to one decimal. An empty whole is 0%, never NaN. */
export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export const round2 = (value: number) => Math.round(value * 100) / 100;

/** The middle value — the mean of the two middle ones for an even count; 0 for nothing. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Per-day values in window order; a day with nothing is 0. */
export function seriesOf(window: AnalyticsWindow, rows: readonly { _id: string; value: number }[]): number[] {
  const byDay = new Map(rows.map((row) => [row._id, row.value]));
  return window.days.map((day) => byDay.get(day) ?? 0);
}

/** Rows keyed by a code, in a fixed order, with 0 for a code that has none. */
export function countsIn<K extends string>(order: readonly K[], rows: readonly { _id: string | null; count: number }[]) {
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  return order.map((key) => ({ key, count: counts.get(key) ?? 0 }));
}
