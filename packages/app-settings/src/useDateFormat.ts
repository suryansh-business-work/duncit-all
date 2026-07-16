import { gql, useQuery } from '@apollo/client';
import { format as fmtFn, isToday, isYesterday, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Admin-configurable display settings (project rule 11): every rendered date
 * and time routes through these so the format — and, in time-zone-aware mode,
 * the zone — follows the admin panel, never a hardcoded pattern.
 */
export const PUBLIC_APP_SETTINGS = gql`
  query PublicAppSettings {
    publicAppSettings {
      date_format
      time_format
      time_zone
    }
  }
`;

const FALLBACK_DATE = 'dd MMM yyyy';
const FALLBACK_TIME_LOCAL = 'hh:mm a';
const FALLBACK_TIME_ZONED = 'HH:mm';
const FALLBACK_ZONE = 'Asia/Kolkata';

export type DateInput = string | number | Date | null | undefined;

export interface UseDateFormatOptions {
  /**
   * When true, formats in the admin-configured `time_zone` (fallback
   * Asia/Kolkata) via date-fns-tz, and the default time pattern is 'HH:mm'.
   * When false (default), formats in the browser's local zone with the
   * default time pattern 'hh:mm a'.
   */
  timeZoneAware?: boolean;
}

/** Browser-local coercion: ISO strings via parseISO (historic portal behavior). */
function toDateLocal(input: DateInput): Date | null {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') return new Date(input);
  try {
    return parseISO(input);
  } catch {
    return null;
  }
}

/** Zone-aware coercion: strings via the Date constructor (historic support behavior). */
function toDateZoned(input: DateInput): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * `publicAppSettings`-driven date/time formatter.
 *
 * All formatters return '' for empty/invalid input instead of throwing.
 * `dayLabel` returns Today / Yesterday / the configured date pattern;
 * `dayKey` returns a 'yyyy-MM-dd' calendar-day key for grouping.
 */
export function useDateFormat(options?: Readonly<UseDateFormatOptions>) {
  const timeZoneAware = options?.timeZoneAware === true;
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  const settings = data?.publicAppSettings;
  const fallbackTime = timeZoneAware ? FALLBACK_TIME_ZONED : FALLBACK_TIME_LOCAL;
  const dateFormat: string = settings?.date_format || FALLBACK_DATE;
  const timeFormat: string = settings?.time_format || fallbackTime;
  const timeZone: string = settings?.time_zone || FALLBACK_ZONE;

  const toDate = timeZoneAware ? toDateZoned : toDateLocal;

  const safeFmt = (input: DateInput, pattern: string): string => {
    const d = toDate(input);
    if (!d) return '';
    try {
      if (timeZoneAware) return formatInTimeZone(d, timeZone, pattern);
      return fmtFn(d, pattern);
    } catch {
      return '';
    }
  };

  const dayLabel = (input: DateInput): string => {
    const d = toDate(input);
    if (!d) return '';
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return safeFmt(input, dateFormat);
  };

  return {
    dateFormat,
    timeFormat,
    timeZone,
    formatDate: (input: DateInput) => safeFmt(input, dateFormat),
    formatTime: (input: DateInput) => safeFmt(input, timeFormat),
    formatDateTime: (input: DateInput) => safeFmt(input, `${dateFormat} · ${timeFormat}`),
    dayLabel,
    dayKey: (input: DateInput) => safeFmt(input, 'yyyy-MM-dd'),
  };
}
