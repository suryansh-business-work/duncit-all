import { useMemo, useState } from 'react';
import { isSameDay, isSameMonth, startOfMonth } from 'date-fns';

import type { ReminderItem } from '@/screens/reminders/ReminderRow';
import { agendaDays, type CalendarView } from './calendarView';
import type { useRemindersCalendar } from './useRemindersCalendar';

type Calendar = ReturnType<typeof useRemindersCalendar>;

/**
 * Which days a calendar lists and how it pages, shared by Home and the
 * Reminders tab: the month view lists the picked day (and keeps a day of the
 * shown month picked while paging); every other view lists all its days.
 */
export function useCalendarAgenda(calendar: Calendar) {
  const { view, cursor, events } = calendar;
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const groups = useMemo(
    () =>
      view === 'month'
        ? agendaDays<ReminderItem>(
            events.filter((e) => isSameDay(e.date, selectedDay)),
            'day',
            selectedDay,
          )
        : agendaDays<ReminderItem>(events, view, cursor),
    [events, view, cursor, selectedDay],
  );

  const changeView = (next: CalendarView) => {
    calendar.setView(next);
    if (next === 'month') setSelectedDay(cursor);
  };
  const changeCursor = (next: Date) => {
    calendar.setCursor(next);
    if (view === 'month' && !isSameMonth(next, selectedDay))
      setSelectedDay(isSameMonth(next, new Date()) ? new Date() : startOfMonth(next));
  };

  return { groups, selectedDay, setSelectedDay, changeView, changeCursor };
}
