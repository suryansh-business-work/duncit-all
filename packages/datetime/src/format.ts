import { format as fmtFn, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

import { createClock, type Clock, type ClockInput } from './clock';

/**
 * Admin-configurable display formatting (project rule 11): every rendered date
 * and time routes through here so the pattern — and, in time-zone-aware mode,
 * the zone — follows the admin panel, never a hardcoded pattern.
 *
 * Only the date-fns API that exists in BOTH v2 (portals/mWeb) and v4 (mobile)
 * is used: `format`, `parseISO` and `formatInTimeZone`. Do not reach for
 * `utcToZonedTime`/`toZonedTime` — they were renamed across date-fns-tz majors.
 */

export const FALLBACK_DATE_FORMAT = 'dd MMM yyyy';
// ONE fallback for every surface, matching the server default for time_format.
// A zoned-only 24h fallback used to make mWeb and the portals disagree while
// settings were still loading.
export const FALLBACK_TIME_FORMAT = 'hh:mm a';
export const FALLBACK_TIME_ZONE = 'Asia/Kolkata';

export type DateInput = string | number | Date | null | undefined;

export interface DateFormatterSettings {
  dateFormat?: string | null;
  timeFormat?: string | null;
  timeZone?: string | null;
  /**
   * Format in the admin-configured zone (date-fns-tz) rather than the device's
   * local zone.
   */
  timeZoneAware?: boolean;
  /** Time source + anchors; drives `now`, `dayLabel` and occasion matching. */
  clock?: ClockInput;
}

/** Browser-local coercion: ISO strings via parseISO (historic portal behavior).
 * parseISO returns an Invalid Date rather than throwing, so the NaN guard is
 * the only check needed. */
function toDateLocal(input: DateInput): Date | null {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') return new Date(input);
  const parsed = parseISO(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Zone-aware coercion: strings via the Date constructor (historic support behavior). */
function toDateZoned(input: DateInput): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface DateFormatter {
  dateFormat: string;
  timeFormat: string;
  timeZone: string;
  clock: Clock;
  /** Current instant per the configured time source. */
  now: () => Date;
  formatDate: (input: DateInput) => string;
  formatTime: (input: DateInput) => string;
  formatDateTime: (input: DateInput) => string;
  /** Today / Yesterday / the configured date pattern — relative to `now`. */
  dayLabel: (input: DateInput) => string;
  /** 'yyyy-MM-dd' calendar-day key for grouping, in the active zone. */
  dayKey: (input: DateInput) => string;
  /** Format with an explicit pattern (escape hatch for one-off displays). */
  formatPattern: (input: DateInput, pattern: string) => string;
}

const DAY_MS = 86_400_000;

/**
 * Build a formatter from resolved settings. Pure: takes settings as arguments
 * and never fetches, so React, React Native and plain Node can all use it.
 * Every formatter returns '' for empty/invalid input instead of throwing.
 */
export function createDateFormatter(settings: Readonly<DateFormatterSettings> = {}): DateFormatter {
  const timeZoneAware = settings.timeZoneAware === true;
  const dateFormat = settings.dateFormat || FALLBACK_DATE_FORMAT;
  const timeFormat = settings.timeFormat || FALLBACK_TIME_FORMAT;
  const timeZone = settings.timeZone || FALLBACK_TIME_ZONE;
  const clock = createClock(settings.clock ?? { source: 'BROWSER' });
  const toDate = timeZoneAware ? toDateZoned : toDateLocal;

  // Parsing and formatting both sit inside the guard: a bad pattern, an unknown
  // time zone or a hostile date string must render '' rather than crash a page.
  const formatPattern = (input: DateInput, pattern: string): string => {
    try {
      const d = toDate(input);
      if (!d) return '';
      return timeZoneAware ? formatInTimeZone(d, timeZone, pattern) : fmtFn(d, pattern);
    } catch {
      return '';
    }
  };

  const dayKey = (input: DateInput) => formatPattern(input, 'yyyy-MM-dd');

  // Compared against the CLOCK's today, so a custom time also moves what
  // "Today" means — not the device's real calendar day.
  const dayLabel = (input: DateInput): string => {
    const key = dayKey(input);
    if (!key) return '';
    const nowMs = clock.nowMs();
    if (key === dayKey(new Date(nowMs))) return 'Today';
    if (key === dayKey(new Date(nowMs - DAY_MS))) return 'Yesterday';
    return formatPattern(input, dateFormat);
  };

  return {
    dateFormat,
    timeFormat,
    timeZone,
    clock,
    now: clock.now,
    formatDate: (input) => formatPattern(input, dateFormat),
    formatTime: (input) => formatPattern(input, timeFormat),
    formatDateTime: (input) => formatPattern(input, `${dateFormat} · ${timeFormat}`),
    dayLabel,
    dayKey,
    formatPattern,
  };
}
