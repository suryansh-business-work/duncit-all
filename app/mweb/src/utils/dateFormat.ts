import { gql, useQuery } from '@apollo/client';
import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const PUBLIC_APP_SETTINGS = gql`
  query PublicAppSettings {
    publicAppSettings {
      date_format
      time_format
      time_zone
      min_birth_year
      max_birth_year
      draft_retention_days
    }
  }
`;

const FALLBACK_DRAFT_RETENTION_DAYS = 3;

/** Admin-configured draft-pod retention window in days (Admin > Pods > Pod
 * Settings), with a safe fallback. Drives the Host Studio draft-expiry note. */
export function useDraftRetentionDays(): number {
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  return (data?.publicAppSettings?.draft_retention_days as number) ?? FALLBACK_DRAFT_RETENTION_DAYS;
}

const FALLBACK_DATE = 'dd MMM yyyy';
const FALLBACK_TIME = 'hh:mm a';
const FALLBACK_ZONE = 'Asia/Kolkata';
const FALLBACK_MIN_BIRTH_YEAR = 1940;
const FALLBACK_MAX_BIRTH_YEAR = 2012;

/** Admin-configured signup birth-year bounds (Admin > Settings), with fallbacks. */
export function useSignupBirthYearBounds() {
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  return {
    minBirthYear: (data?.publicAppSettings?.min_birth_year as number) ?? FALLBACK_MIN_BIRTH_YEAR,
    maxBirthYear: (data?.publicAppSettings?.max_birth_year as number) ?? FALLBACK_MAX_BIRTH_YEAR,
  };
}

type DateInput = string | number | Date | null | undefined;

export function useDateFormat() {
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  const dateFormat: string = data?.publicAppSettings?.date_format || FALLBACK_DATE;
  const timeFormat: string = data?.publicAppSettings?.time_format || FALLBACK_TIME;
  const timeZone: string = data?.publicAppSettings?.time_zone || FALLBACK_ZONE;

  const toDate = (input: DateInput): Date | null => {
    if (!input) return null;
    if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
    if (typeof input === 'number') return new Date(input);
    try {
      return parseISO(input);
    } catch {
      return null;
    }
  };

  // Format in the admin-configured IANA zone so every client renders the same
  // wall-clock time regardless of the viewer's device timezone (B10).
  const safeFmt = (d: Date | null, p: string) => {
    if (!d) return '';
    try {
      return formatInTimeZone(d, timeZone, p);
    } catch {
      return '';
    }
  };

  return {
    dateFormat,
    timeFormat,
    timeZone,
    formatDate: (input: DateInput) => safeFmt(toDate(input), dateFormat),
    formatTime: (input: DateInput) => safeFmt(toDate(input), timeFormat),
    formatDateTime: (input: DateInput) => safeFmt(toDate(input), `${dateFormat} · ${timeFormat}`),
  };
}

/** Human duration between two dates — "2d 3h", "2h 30m", "45m"; null when
 * either side is missing or the end isn't after the start. Mirrors mobile. */
export function formatDurationBetween(start: Date | null, end: Date | null): string | null {
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes <= 0) return null;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(' ');
}
