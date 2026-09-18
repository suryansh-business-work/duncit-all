/**
 * `HH:mm` onto a Date the MUI TimePicker can hold, and back again.
 *
 * Every admin-configured schedule (the nightly backup, the E2E run, analytics
 * mails) stores wall-clock time as a string while the picker works in Dates,
 * so there is one conversion and no two consoles can round-trip differently.
 *
 * The date part is deliberately today's: only the hours and minutes are ever
 * read back out, and the server resolves them against the platform's own time
 * zone rather than this browser's. `fallback` is the schedule's own default,
 * used when nothing has been configured yet.
 */
export function timeOfDayToDate(value: string, fallback: string): Date {
  const [hours, minutes] = (value || fallback).split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

export function dateToTimeOfDay(date: Date | null, fallback: string): string {
  if (!date || Number.isNaN(date.getTime())) return fallback;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
