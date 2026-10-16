import type { PodSeriesFrequency } from './podSeries.model';

const DAY_MS = 24 * 60 * 60 * 1000;

const STEP_DAYS: Record<PodSeriesFrequency, number> = {
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
 * Every date a series would run on: the first one, then one step later, and so
 * on while the date still falls on or before `endsOn` — capped at `maxCount`
 * dates in all. Each date keeps the first date's time of day and length.
 *
 * Steps are whole days of 24 hours. The platform's zones (Asia/Kolkata and
 * friends) keep no daylight saving, so a whole day is always the same wall
 * clock; a zone that moved its clocks would shift a date by that hour.
 */
export function seriesWindows(
  first: SeriesWindow,
  frequency: PodSeriesFrequency,
  endsOn: Date,
  maxCount: number
): SeriesWindow[] {
  const step = STEP_DAYS[frequency] * DAY_MS;
  // `endsOn` is the LAST MOMENT of the host's chosen end day, worked out by the
  // client in the admin-set zone, so a date that starts that evening counts.
  const lastStart = endsOn.getTime();
  const length = first.end ? first.end.getTime() - first.start.getTime() : null;
  const out: SeriesWindow[] = [];
  for (let at = first.start.getTime(); at <= lastStart && out.length < maxCount; at += step) {
    out.push({ start: new Date(at), end: length === null ? null : new Date(at + length) });
  }
  return out;
}

/** Whether `endsOn` lies within `maxSpanDays` of the first date. */
export function withinSpan(firstStart: Date, endsOn: Date, maxSpanDays: number): boolean {
  return endsOn.getTime() - firstStart.getTime() <= (maxSpanDays + 1) * DAY_MS;
}
