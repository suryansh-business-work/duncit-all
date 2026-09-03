import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { formatDate } from '@duncit/datetime';
import type { CalendarView } from './types';

/** The window the active view shows, and so the range of slots to fetch. */
export function viewRange(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  if (view === 'day') return { from: startOfDay(anchor), to: endOfDay(anchor) };
  if (view === 'week') {
    return { from: startOfWeek(anchor, { weekStartsOn: 0 }), to: endOfWeek(anchor, { weekStartsOn: 0 }) };
  }
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

/** What the toolbar prints between the arrows, in the active view's units. */
export function periodLabel(view: CalendarView, anchor: Date, range: { from: Date; to: Date }): string {
  if (view === 'day') return formatDate(anchor);
  if (view === 'week') return `${format(range.from, 'dd MMM')} – ${format(range.to, 'dd MMM')}`;
  return format(anchor, 'MMMM yyyy');
}

/** One step forward or back — a month, a week or a day, per the active view. */
export function shiftAnchor(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  if (view === 'month') return addMonths(anchor, direction);
  if (view === 'week') return addDays(anchor, direction * 7);
  return addDays(anchor, direction);
}
