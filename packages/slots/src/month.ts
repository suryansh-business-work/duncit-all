/**
 * Month-grid geometry for the calendars.
 *
 * MUIX's `DateCalendar` draws its own grid on the web, so this exists for the
 * Tamagui calendar — which has no MUIX equivalent and must be hand-drawn. Both
 * sides share the day KEYS and the enabled/selected rules, so the two calendars
 * agree on what is clickable even though only one of them owns its layout.
 *
 * Everything here is plain calendar arithmetic on 'yyyy-MM-dd' keys: no
 * date-fns, no zones. A day key is already zone-resolved by the formatter before
 * it gets here, so treating it as a bare civil date is correct and keeps the
 * grid from drifting when the admin zone differs from the device's.
 */

/** 'yyyy-MM' for a day key or a month key. */
export function monthKeyOf(dayKey: string): string {
  return dayKey.slice(0, 7);
}

function daysInMonth(year: number, month1: number): number {
  // Day 0 of the next month is the last day of this one; month1 is 1-based, and
  // Date's month argument is 0-based, so `month1` already means "next month".
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Shift a 'yyyy-MM' month key by whole months. */
export function addMonths(monthKey: string, delta: number): string {
  const year = Number(monthKey.slice(0, 4));
  const month1 = Number(monthKey.slice(5, 7));
  const zeroBased = year * 12 + (month1 - 1) + delta;
  return `${String(Math.floor(zeroBased / 12)).padStart(4, '0')}-${pad2((zeroBased % 12) + 1)}`;
}

/** The weekday column of a day key, 0 = Monday … 6 = Sunday. */
export function weekdayIndex(dayKey: string): number {
  const year = Number(dayKey.slice(0, 4));
  const month1 = Number(dayKey.slice(5, 7));
  const day = Number(dayKey.slice(8, 10));
  // getUTCDay is 0 = Sunday; the grid starts on Monday.
  return (new Date(Date.UTC(year, month1 - 1, day)).getUTCDay() + 6) % 7;
}

/**
 * A month as rows of 7 cells, Monday-first. Cells outside the month are null so
 * a renderer can leave them blank rather than showing a neighbouring month's
 * days, which would be selectable-looking but out of range.
 */
export function buildMonthGrid(monthKey: string): (string | null)[][] {
  const year = Number(monthKey.slice(0, 4));
  const month1 = Number(monthKey.slice(5, 7));
  const total = daysInMonth(year, month1);
  const cells: (string | null)[] = Array.from(
    { length: weekdayIndex(`${monthKey}-01`) },
    () => null,
  );
  for (let day = 1; day <= total; day++) cells.push(`${monthKey}-${pad2(day)}`);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const WEEKDAY_IDS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/**
 * Monday-first weekday initials, formatted rather than hardcoded so the header
 * follows the locale. Each carries a stable id because the initials themselves
 * repeat (T/T, S/S) and so cannot key a list on their own.
 */
export function weekdayInitials(
  fmt: Readonly<{ formatPattern: (d: Date, p: string) => string }>,
): { id: string; label: string }[] {
  // 2024-01-01 was a Monday; seven consecutive UTC days give the column order.
  return WEEKDAY_IDS.map((id, i) => ({
    id,
    label: fmt.formatPattern(new Date(Date.UTC(2024, 0, 1 + i)), 'EEEEE'),
  }));
}

/** Clamp a month key into [firstMonth, lastMonth]; used to bound the arrows. */
export function clampMonth(monthKey: string, first: string, last: string): string {
  if (monthKey < first) return first;
  if (monthKey > last) return last;
  return monthKey;
}
