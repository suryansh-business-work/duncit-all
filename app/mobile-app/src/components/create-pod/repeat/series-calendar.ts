import { POD_SERIES_SKIP_REASON_KEY, ymdInZone } from '@duncit/utils';
import { monthKeyOf } from '@duncit/slots';

import type { SeriesPreviewDate } from './useSeriesPreview';

/** How one day of the series calendar stands. */
export type SeriesDayStatus = 'RUNS' | 'ON_REQUEST' | 'CANNOT_RUN' | 'REMOVED';

export interface SeriesDayMark {
  status: SeriesDayStatus;
  /** The date's ISO start, as the preview gave it — null for a picked day
   * the server has not answered for yet. */
  startAt: string | null;
  /** Why it cannot run, as a translation key. */
  reasonKey: string | null;
}

/** Each status's legend line, in the order the legend shows them. */
export const SERIES_DAY_STATUS_KEY: Record<SeriesDayStatus, string> = {
  RUNS: 'mweb.podSeries.legendRuns',
  ON_REQUEST: 'mweb.podSeries.legendOnRequest',
  CANNOT_RUN: 'mweb.podSeries.legendCannotRun',
  REMOVED: 'mweb.podSeries.legendRemoved',
};

function statusOf(date: SeriesPreviewDate, skipped: ReadonlySet<string>): SeriesDayStatus {
  if (!date.available) return 'CANNOT_RUN';
  if (skipped.has(date.start_at)) return 'REMOVED';
  return date.on_request ? 'ON_REQUEST' : 'RUNS';
}

/**
 * Every preview date on its calendar day (in the admin's zone): runs, runs once
 * the venue opens a slot, cannot run (and why), or left out by the host. A
 * CUSTOM day the host just tapped shows as running until the server answers.
 */
export function seriesDayMarks(
  dates: readonly SeriesPreviewDate[],
  skipped: readonly string[],
  customDays: readonly string[],
  timeZone: string,
): Map<string, SeriesDayMark> {
  const skip = new Set(skipped);
  const marks = new Map<string, SeriesDayMark>();
  for (const day of customDays) marks.set(day, { status: 'RUNS', startAt: null, reasonKey: null });
  for (const date of dates) {
    const day = ymdInZone(date.start_at, timeZone);
    if (!day) continue;
    marks.set(day, {
      status: statusOf(date, skip),
      startAt: date.start_at,
      reasonKey: date.reason ? POD_SERIES_SKIP_REASON_KEY[date.reason] : null,
    });
  }
  return marks;
}

/** The months the calendar pages through: the first date's to the end day's. */
export function seriesMonthBounds(
  firstDay: string,
  endDay: string,
): { first: string; last: string } {
  const first = monthKeyOf(firstDay);
  const last = endDay && endDay > firstDay ? monthKeyOf(endDay) : first;
  return { first, last };
}

/** Whether a day toggles: a CUSTOM pick any day after the first up to the end
 * day; otherwise a date that can run (left out, or brought back). */
export function dayTappable(
  day: string,
  mark: SeriesDayMark | undefined,
  range: { custom: boolean; firstDay: string; endDay: string },
): boolean {
  if (range.custom) return day > range.firstDay && !!range.endDay && day <= range.endDay;
  return !!mark?.startAt && mark.status !== 'CANNOT_RUN';
}
