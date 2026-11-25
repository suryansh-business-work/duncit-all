import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { formatDate } from '@duncit/datetime';
import type { CrmCalendarEvent, CrmCalendarReminder } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';

/** The portal calendar's views. */
export const CALENDAR_VIEWS = ['day', 'week', 'month', 'year', 'upcoming'] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const VIEW_LABEL_KEY: Record<CalendarView, string> = {
  day: 'crm.components.day',
  week: 'crm.components.week',
  month: 'crm.components.month',
  year: 'crm.components.year',
  upcoming: 'crm.components.upcoming',
};

/** Upcoming looks this many days ahead, as the portal's does. */
export const UPCOMING_DAYS = 60;

/** Previous / next period of a view (Upcoming does not page). */
export function stepCursor(view: CalendarView, cursor: Date, dir: 1 | -1): Date {
  if (view === 'day') return addDays(cursor, dir);
  if (view === 'week') return addWeeks(cursor, dir);
  if (view === 'year') return addYears(cursor, dir);
  return addMonths(cursor, dir);
}

/** The days a view covers, whole days at both ends. */
export function viewRange(
  view: CalendarView,
  cursor: Date,
  now: Date = new Date(),
): { start: Date; end: Date } {
  if (view === 'day') return { start: startOfDay(cursor), end: endOfDay(cursor) };
  if (view === 'week') return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
  if (view === 'year') return { start: startOfYear(cursor), end: endOfYear(cursor) };
  if (view === 'upcoming')
    return { start: startOfDay(now), end: endOfDay(addDays(now, UPCOMING_DAYS)) };
  return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
}

/** The period a view shows, as its heading reads. */
export function viewTitle(view: CalendarView, cursor: Date, t: Translate): string {
  const { start, end } = viewRange(view, cursor);
  if (view === 'week') return `${formatDate(start)} – ${formatDate(end)}`;
  if (view === 'day') return formatDate(cursor);
  if (view === 'year') return format(cursor, 'yyyy');
  if (view === 'upcoming') return t('crm.components.upcoming');
  return format(cursor, 'MMMM yyyy');
}

export type CalendarEvent<R extends CrmCalendarReminder> = CrmCalendarEvent<R>;

/** One day of a list view and what falls on it. */
export interface AgendaDay<R extends CrmCalendarReminder> {
  day: Date;
  events: CalendarEvent<R>[];
}

/**
 * A list view's days, each with its events (only days that have some). The
 * phone's Upcoming also keeps earlier reminders that are still pending, at the
 * top, so nothing overdue drops out of sight.
 */
export function agendaDays<R extends CrmCalendarReminder>(
  events: readonly CalendarEvent<R>[],
  view: CalendarView,
  cursor: Date,
  now: Date = new Date(),
): AgendaDay<R>[] {
  const { start, end } = viewRange(view, cursor, now);
  const overdue = (e: CalendarEvent<R>) =>
    view === 'upcoming' && e.kind === 'reminder' && e.status !== 'DONE';
  const shown = events.filter(
    (e) => (e.date >= start && e.date <= end) || (e.date < start && overdue(e)),
  );
  const days: AgendaDay<R>[] = [];
  for (const event of shown) {
    const last = days.at(-1);
    if (last && isSameDay(last.day, event.date)) last.events.push(event);
    else days.push({ day: startOfDay(event.date), events: [event] });
  }
  return days;
}

/** The month grid's days: whole weeks from the one the month starts in to the one it ends in. */
export const monthGridDays = (cursor: Date): Date[] =>
  eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  });
