import { createContext } from 'react';
import type { SxProps, Theme } from '@mui/material';
import { ymdInZone, type PodSeriesSkipReason } from '@duncit/utils';
import type { SeriesPreviewDate } from './useSeriesPreview';

/** How a day of a recurring plan stands on the host's calendar. */
export type SeriesDayState = 'RUNS' | 'ON_REQUEST' | 'CANNOT_RUN' | 'REMOVED';

export interface SeriesDayMark {
  state: SeriesDayState;
  /** The date's ISO start (what a left-out date is stored as); null for a
   * hand-picked day the preview has not answered yet. */
  startAt: string | null;
  reason: PodSeriesSkipReason | null;
}

/** How each state is worded (legend and a day's accessible name). */
export const SERIES_DAY_LABEL_KEY: Record<SeriesDayState, string> = {
  RUNS: 'mweb.podSeries.legendRuns',
  ON_REQUEST: 'mweb.podSeries.legendOnRequest',
  CANNOT_RUN: 'mweb.podSeries.legendCannotRun',
  REMOVED: 'mweb.podSeries.legendRemoved',
};

/** The legend, in the order it reads. */
export const SERIES_DAY_STATES: readonly SeriesDayState[] = ['RUNS', 'ON_REQUEST', 'CANNOT_RUN', 'REMOVED'];

/** One look per state — theme tokens only. `&&` outranks the day's own
 * selected / disabled styles, so a mark reads the same either way. */
export const SERIES_DAY_SX = {
  RUNS: {
    '&&': { bgcolor: 'success.main', color: 'success.contrastText' },
    '&&:hover': { bgcolor: 'success.dark' },
  },
  ON_REQUEST: {
    '&&': { border: 2, borderStyle: 'dashed', borderColor: 'warning.main', color: 'text.primary', bgcolor: 'transparent' },
  },
  CANNOT_RUN: {
    '&&': { border: 1, borderStyle: 'dotted', borderColor: 'error.main', color: 'error.main', textDecoration: 'line-through', bgcolor: 'transparent' },
  },
  REMOVED: {
    '&&': { border: 1, borderColor: 'text.secondary', color: 'text.secondary', bgcolor: 'transparent' },
  },
} satisfies Record<SeriesDayState, SxProps<Theme>>;

function stateOf(date: SeriesPreviewDate, skipped: ReadonlySet<string>): SeriesDayState {
  if (!date.available) return 'CANNOT_RUN';
  if (skipped.has(date.start_at)) return 'REMOVED';
  return date.on_request ? 'ON_REQUEST' : 'RUNS';
}

/**
 * Each previewed date on its calendar day (`yyyy-MM-dd` in the admin zone).
 * Hand-picked days the preview has not answered yet read as running, so a tap
 * shows at once.
 */
export function seriesDayMarks(input: {
  dates: readonly SeriesPreviewDate[];
  skipped: readonly string[];
  customDays: readonly string[];
  timeZone: string;
}): Map<string, SeriesDayMark> {
  const skipped = new Set(input.skipped);
  const marks = new Map<string, SeriesDayMark>();
  for (const day of input.customDays) marks.set(day, { state: 'RUNS', startAt: null, reason: null });
  for (const date of input.dates) {
    const day = ymdInZone(date.start_at, input.timeZone);
    if (day) marks.set(day, { state: stateOf(date, skipped), startAt: date.start_at, reason: date.reason ?? null });
  }
  return marks;
}

/** What a calendar day cell reads — MUIX day slots take no extra props. */
export interface SeriesDayContextValue {
  markOf: (day: string) => SeriesDayMark | undefined;
  /** The day's accessible name, with how it stands. */
  labelOf: (day: string, mark: SeriesDayMark) => string;
  /** Why a date cannot run, for its tooltip. */
  reasonOf: (mark: SeriesDayMark) => string | null;
}

export const SeriesDayContext = createContext<SeriesDayContextValue | null>(null);
