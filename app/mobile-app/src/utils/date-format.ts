import { format, parseISO } from 'date-fns';

/** Fallback display formats — admin-configurable formatting is a follow-up (rule 11). */
const DATE_FORMAT = 'dd MMM yyyy';
const DATE_TIME_FORMAT = 'dd MMM yyyy, hh:mm a';

type DateInput = string | number | Date | null | undefined;

const toDate = (input: DateInput): Date | null => {
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
export function formatDate(input: DateInput): string {
  const date = toDate(input);
  return date ? format(date, DATE_FORMAT) : '';
}

/** Local-timezone date+time label, e.g. "07 Jun 2026, 06:30 PM". Empty when unparseable. */
export function formatDateTime(input: DateInput): string {
  const date = toDate(input);
  return date ? format(date, DATE_TIME_FORMAT) : '';
}

/** "X remaining" until a status auto-expires; null when unknown/expired —
 * mirrors mWeb's statusRemainingLabel so both viewers read identically. */
export function statusRemainingLabel(
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const expiry = toDate(expiresAt);
  if (!expiry || expiry.getTime() <= now.getTime()) return null;
  const minutes = Math.ceil((expiry.getTime() - now.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h remaining`;
  return `${Math.floor(hours / 24)}d remaining`;
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

/** Human duration between two dates — "2d 3h", "2h 30m", "45m"; null when
 * either side is missing or the end isn't after the start. Mirrors mWeb. */
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
