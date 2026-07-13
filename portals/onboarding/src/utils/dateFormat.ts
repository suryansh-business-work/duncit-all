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

type DateInput = string | number | Date | null | undefined;

export function useDateFormat() {
  const { data } = useQuery(PUBLIC_APP_SETTINGS, { fetchPolicy: 'cache-first' });
  const dateFormat: string = data?.publicAppSettings?.date_format || FALLBACK_DATE;
  const timeFormat: string = data?.publicAppSettings?.time_format || FALLBACK_TIME;

  const toDate = (input: DateInput): Date | null => {
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
    formatDate: (input: DateInput) => safeFmt(toDate(input), dateFormat),
    formatTime: (input: DateInput) => safeFmt(toDate(input), timeFormat),
    formatDateTime: (input: DateInput) => safeFmt(toDate(input), `${dateFormat} · ${timeFormat}`),
  };
}
