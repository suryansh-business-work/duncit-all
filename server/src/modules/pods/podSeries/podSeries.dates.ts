import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { getAppTimeZone } from '@utils/app-time';
import type { PodSeriesFrequency } from './podSeries.model';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Frequencies that step a fixed number of whole days. */
const STEP_DAYS: Partial<Record<PodSeriesFrequency, number>> = {
  DAILY: 1,
  WEEKLY: 7,
  BIWEEKLY: 14,
};

export interface SeriesWindow {
  start: Date;
  /** Null for a pod with no end (a physical pod takes its end from its slot). */
  end: Date | null;
}

/**
 * The start of the `k`-th month after `first`, on the same day of the month and
 * wall-clock time in the app's zone — or that month's last day when it is
 * shorter (a pod on the 31st runs on 30 Nov, 28 Feb). Always counted from the
 * FIRST date, so one short month never drags the later dates earlier.
 */
function monthlyStart(first: Date, k: number): Date {
  const zone = getAppTimeZone();
  const wall = toZonedTime(first, zone);
  const year = wall.getFullYear();
  const month = wall.getMonth() + k;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(wall.getDate(), lastDay);
  const at = new Date(year, month, day, wall.getHours(), wall.getMinutes(), wall.getSeconds(), wall.getMilliseconds());
  return fromZonedTime(at, zone);
}

/** The n-th date's start for a stepping frequency, or null when there is no n-th. */
function nthStart(first: Date, frequency: PodSeriesFrequency, n: number): Date | null {
  if (frequency === 'MONTHLY') return monthlyStart(first, n);
  const step = STEP_DAYS[frequency];
  return step ? new Date(first.getTime() + n * step * DAY_MS) : null;
}

/**
 * The host's own calendar picks (CUSTOM): after the first date, each pick that
 * lands on the first date's time of day a whole number of days later. Anything
 * else — an earlier date, a different time, a duplicate — is dropped rather
 * than trusted, so the client cannot invent a window the first slot never had.
 */
function customStarts(first: Date, customDates: readonly string[]): Date[] {
  const seen = new Set<number>([first.getTime()]);
  const out: Date[] = [first];
  for (const raw of customDates) {
    const at = new Date(raw).getTime();
    if (Number.isNaN(at) || at <= first.getTime() || (at - first.getTime()) % DAY_MS !== 0 || seen.has(at)) continue;
    seen.add(at);
    out.push(new Date(at));
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Every date a series would run on: the first one, then one step later, and so
 * on while the date still falls on or before `endsOn` — capped at `maxCount`
 * dates in all. Each date keeps the first date's time of day and length.
 * CUSTOM takes the host's own picks instead of a step.
 *
 * Day steps are whole days of 24 hours. The platform's zones (Asia/Kolkata and
 * friends) keep no daylight saving, so a whole day is always the same wall
 * clock; a zone that moved its clocks would shift a date by that hour.
 */
export function seriesWindows(
  first: SeriesWindow,
  frequency: PodSeriesFrequency,
  endsOn: Date,
  maxCount: number,
  customDates: readonly string[] = []
): SeriesWindow[] {
  // `endsOn` is the LAST MOMENT of the host's chosen end day, worked out by the
  // client in the admin-set zone, so a date that starts that evening counts.
  const lastStart = endsOn.getTime();
  const length = first.end ? first.end.getTime() - first.start.getTime() : null;
  const windowAt = (start: Date): SeriesWindow => ({
    start,
    end: length === null ? null : new Date(start.getTime() + length),
  });
  if (frequency === 'CUSTOM') {
    return customStarts(first.start, customDates)
      .filter((s) => s.getTime() <= lastStart)
      .slice(0, maxCount)
      .map(windowAt);
  }
  const out: SeriesWindow[] = [];
  for (let n = 0; out.length < maxCount; n += 1) {
    const start = nthStart(first.start, frequency, n);
    if (!start || start.getTime() > lastStart) break;
    out.push(windowAt(start));
  }
  return out;
}

/** Whether `endsOn` lies within `maxSpanDays` of the first date. */
export function withinSpan(firstStart: Date, endsOn: Date, maxSpanDays: number): boolean {
  return endsOn.getTime() - firstStart.getTime() <= (maxSpanDays + 1) * DAY_MS;
}
