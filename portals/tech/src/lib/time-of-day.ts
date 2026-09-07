/**
 * `HH:mm` onto a Date the MUI TimePicker can hold, and back again.
 *
 * Two admin-configured schedules in this portal ask the same question — the
 * nightly database backup and the nightly e2e run — and both store wall-clock
 * time as a string while the picker works in Dates. One conversion, so the two
 * cannot round-trip differently.
 *
 * The date part is deliberately today's: only the hours and minutes are ever
 * read back out, and the server resolves them against the platform's own
 * timezone rather than this browser's.
 */

/** The quiet hour a nightly job defaults to when nothing has been configured. */
const DEFAULT_TIME = '03:00';

export function timeToDate(value: string): Date {
  const [h, m] = (value || DEFAULT_TIME).split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
}

export function dateToTime(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return DEFAULT_TIME;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
