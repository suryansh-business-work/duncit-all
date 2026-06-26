import { gql, useQuery } from '@apollo/client';
import { formatInTimeZone } from 'date-fns-tz';
import { isToday, isYesterday } from 'date-fns';

/** Admin-configurable display settings used to format every chat/ticket time. */
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
const FALLBACK_TIME = 'HH:mm';
const FALLBACK_ZONE = 'Asia/Kolkata';

function toDate(input: string | number | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Timezone-aware formatter keyed off `publicAppSettings`. All timestamps and
 * day-separators in the support chat/ticket surfaces route through this so the
 * agent sees times in the admin-configured zone (never the browser's).
 */
export function useDateFormat() {
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  const settings = data?.publicAppSettings;
  const dateFormat: string = settings?.date_format || FALLBACK_DATE;
  const timeFormat: string = settings?.time_format || FALLBACK_TIME;
  const timeZone: string = settings?.time_zone || FALLBACK_ZONE;

  const safeFmt = (input: string | number | Date | null | undefined, pattern: string) => {
    const d = toDate(input);
    if (!d) return '';
    try {
      return formatInTimeZone(d, timeZone, pattern);
    } catch {
      return '';
    }
  };

  const dayLabel = (input: string | number | Date | null | undefined) => {
    const d = toDate(input);
    if (!d) return '';
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return safeFmt(d, dateFormat);
  };

  return {
    timeZone,
    formatTime: (input: string | number | Date | null | undefined) => safeFmt(input, timeFormat),
    /** Returns Today / Yesterday / the configured date pattern. */
    dayLabel,
    /** Calendar-day key (in the configured zone) used to group messages. */
    dayKey: (input: string | number | Date | null | undefined) => safeFmt(input, 'yyyy-MM-dd'),
  };
}
