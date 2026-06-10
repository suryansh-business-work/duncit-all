import { format, parseISO } from 'date-fns';

/** Fallback display formats — admin-configurable formatting is a follow-up (rule 11). */
const DATE_FORMAT = 'dd MMM yyyy';
const DATE_TIME_FORMAT = 'dd MMM yyyy, hh:mm a';

const toDate = (input: string | number | Date | null | undefined): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') return new Date(input);
  try {
    const parsed = parseISO(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

/** Local-timezone date label, e.g. "07 Jun 2026". Empty string when unparseable. */
export function formatDate(input: string | number | Date | null | undefined): string {
  const date = toDate(input);
  return date ? format(date, DATE_FORMAT) : '';
}

/** Local-timezone date+time label, e.g. "07 Jun 2026, 06:30 PM". Empty when unparseable. */
export function formatDateTime(input: string | number | Date | null | undefined): string {
  const date = toDate(input);
  return date ? format(date, DATE_TIME_FORMAT) : '';
}

/** Compact "time since" label (now / 5m / 3h / 2d) — RN port of mWeb's formatRelative. */
export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
