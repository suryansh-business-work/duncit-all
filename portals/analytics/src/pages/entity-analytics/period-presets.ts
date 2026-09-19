import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';

/**
 * The calendar periods a dashboard can report on beside the rolling ones:
 * this month so far, last month, any one month, or a custom range. Each is a
 * `from`–`to` range of `yyyy-MM-dd` days, inclusive — what the server reads.
 */

export type CalendarMode = 'thisMonth' | 'lastMonth' | 'month' | 'custom';

export interface DayRange {
  from: string;
  to: string;
}

export const CALENDAR_OPTIONS: ReadonlyArray<{ mode: CalendarMode; label: string; testId: string }> = [
  { mode: 'thisMonth', label: 'analytics.page.thisMonth', testId: 'this-month' },
  { mode: 'lastMonth', label: 'analytics.page.lastMonth', testId: 'last-month' },
  { mode: 'month', label: 'analytics.page.month', testId: 'month' },
  { mode: 'custom', label: 'analytics.page.custom', testId: 'custom' },
];

export const toDay = (date: Date) => format(date, 'yyyy-MM-dd');

/** One calendar month, ending today when it is the current month — a range never reaches the future. */
export function monthRange(month: Date, today = new Date()): DayRange {
  const end = endOfMonth(month);
  return { from: toDay(startOfMonth(month)), to: toDay(end < today ? end : today) };
}

/** The range a preset stands for; null for the two that wait for the reader to pick dates. */
export function presetRange(mode: CalendarMode, today = new Date()): DayRange | null {
  if (mode === 'thisMonth') return monthRange(today, today);
  if (mode === 'lastMonth') return monthRange(subMonths(today, 1), today);
  return null;
}
