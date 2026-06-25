import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { MeetingAvailability } from '../queries';

export type CalendarView = 'day' | 'week' | 'month';

const HH = (t: string) => Number.parseInt(t.split(':')[0] ?? '0', 10);

/** Days to render for the given view + cursor (week starts Sunday). */
export function viewDays(view: CalendarView, cursor: Date): Date[] {
  if (view === 'day') return [cursor];
  if (view === 'week') return eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });
  return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) });
}

/** Step the cursor one unit back/forward for the active view. */
export function stepCursor(view: CalendarView, cursor: Date, dir: 1 | -1): Date {
  if (view === 'day') return addDays(cursor, dir);
  if (view === 'week') return addWeeks(cursor, dir);
  return addMonths(cursor, dir);
}

/** Heading label for the visible range. */
export function rangeLabel(view: CalendarView, cursor: Date): string {
  if (view === 'day') return format(cursor, 'EEEE, d MMM yyyy');
  if (view === 'month') return format(cursor, 'MMMM yyyy');
  const week = viewDays('week', cursor);
  return `${format(week[0], 'd MMM')} – ${format(week[6], 'd MMM yyyy')}`;
}

/** Hour range [startHour, endHour] for the day/week grid — working hours padded
 * an hour each side, widened to include any out-of-hours events. */
export function hourRange(av: MeetingAvailability | undefined, eventHours: number[]): [number, number] {
  let lo = av ? Math.max(HH(av.start_time) - 1, 0) : 8;
  let hi = av ? Math.min(HH(av.end_time) + 1, 24) : 19;
  for (const h of eventHours) {
    lo = Math.min(lo, h);
    hi = Math.max(hi, h + 1);
  }
  return [lo, Math.min(hi, 24)];
}

export const isWeekendDay = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** True when the hour on the day is a configured working hour (enabled weekday
 * + inside business hours). Availability times are wall-clock IST. */
export function isWorkingHour(av: MeetingAvailability | undefined, day: Date, hour: number): boolean {
  if (!av) return true;
  if (!av.week_days.includes(day.getDay())) return false;
  return hour >= HH(av.start_time) && hour < HH(av.end_time);
}

/** Fraction (0–1) of the visible range a given instant sits at. */
export function dayFraction(date: Date, lo: number, hi: number): number {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (minutes - lo * 60) / ((hi - lo) * 60);
}
