import { gql, useQuery } from '@apollo/client';
import { format as fmtFn, parseISO } from 'date-fns';

export const PUBLIC_APP_SETTINGS = gql`
  query PublicAppSettings {
    publicAppSettings {
      date_format
      time_format
    }
  }
`;

const FALLBACK_DATE = 'dd MMM yyyy';
const FALLBACK_TIME = 'hh:mm a';

export function useDateFormat() {
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  const dateFormat: string = data?.publicAppSettings?.date_format || FALLBACK_DATE;
  const timeFormat: string = data?.publicAppSettings?.time_format || FALLBACK_TIME;

  const toDate = (input: string | number | Date | null | undefined): Date | null => {
    if (!input) return null;
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
    if (typeof input === 'number') return new Date(input);
    try {
      return parseISO(input);
    } catch {
      return null;
    }
  };

  const safeFmt = (d: Date | null, p: string) => {
    if (!d) return '';
    try {
      return fmtFn(d, p);
    } catch {
      return '';
    }
  };

  return {
    dateFormat,
    timeFormat,
    formatDate: (input: string | number | Date | null | undefined) =>
      safeFmt(toDate(input), dateFormat),
    formatTime: (input: string | number | Date | null | undefined) =>
      safeFmt(toDate(input), timeFormat),
    formatDateTime: (input: string | number | Date | null | undefined) =>
      safeFmt(toDate(input), `${dateFormat} · ${timeFormat}`),
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
