import { addDays, addHours, addMonths, endOfMonth, endOfWeek, format, parse, startOfMonth, startOfWeek } from 'date-fns';

/**
 * A month as the calendar draws it: whole weeks, Monday first, the days of
 * the neighbouring months filling the first and last rows. Days are
 * 'yyyy-MM-dd' keys, the same keys the admin-zone `dayKey` gives each post,
 * so a post lands on the day the marketer means.
 */
const WEEK = { weekStartsOn: 1 } as const;
const DAY = 'yyyy-MM-dd';
/** When a post created from a future day's "+" is pencilled in for. */
const DEFAULT_HOUR = 10;

const dayDate = (day: string) => parse(day, DAY, new Date());
const monthDate = (month: string) => dayDate(`${month}-01`);

export function monthWeeks(month: string): string[][] {
  const first = startOfWeek(startOfMonth(monthDate(month)), WEEK);
  const last = endOfWeek(endOfMonth(monthDate(month)), WEEK);
  const weeks: string[][] = [];
  for (let day = first; day <= last; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, offset) => format(addDays(day, offset), DAY)));
  }
  return weeks;
}

export const shiftMonth = (month: string, by: number) => format(addMonths(monthDate(month), by), 'yyyy-MM');

export const monthTitle = (month: string) => format(monthDate(month), 'MMMM yyyy');

export const weekdayNames = (week: readonly string[]) => week.map((day) => format(dayDate(day), 'EEE'));

/** Mon … Sun — the order the server's weekday averages come in. */
export const mondayFirstWeekdays = () => {
  const monday = startOfWeek(new Date(), WEEK);
  return Array.from({ length: 7 }, (_, offset) => format(addDays(monday, offset), 'EEE'));
};

export const dayNumber = (day: string) => Number(day.slice(8));

export const dayTitle = (day: string) => format(dayDate(day), 'EEEE d MMMM');

/** The instants the grid covers, for the calendar query: [first day, day after the last). */
export function gridRange(weeks: readonly string[][]): { from: string; to: string } {
  const days = weeks.flat();
  const first = days[0] ?? format(new Date(), DAY);
  const last = days.at(-1) ?? first;
  return { from: dayDate(first).toISOString(), to: addDays(dayDate(last), 1).toISOString() };
}

/** A sensible time for a post started from a day: an hour from now today, 10:00 on a later day. */
export function suggestedTime(day: string, today: string): string {
  if (day === today) return addHours(new Date(), 1).toISOString();
  return addHours(dayDate(day), DEFAULT_HOUR).toISOString();
}
