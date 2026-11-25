import { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { format, isSameDay, isSameMonth, startOfMonth } from 'date-fns';
import { useTheme } from 'tamagui';

import { StateView } from '@/components/StateView';
import {
  agendaDays,
  type CalendarEvent,
  type CalendarView,
} from '@/features/reminders/calendarView';
import { useRemindersCalendar } from '@/features/reminders/useRemindersCalendar';
import { isLeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import type { ReminderItem } from './ReminderRow';
import { RemindersDayGroup } from './RemindersDayGroup';
import { RemindersEventSheet } from './RemindersEventSheet';
import { RemindersHeader } from './RemindersHeader';
import { RemindersMonthGrid } from './RemindersMonthGrid';

type Event = CalendarEvent<ReminderItem>;

/**
 * CRM › Reminders — the portal's calendar of reminders and lead follow-ups:
 * Day, Week, Month, Year and Upcoming views, filtered by type and status,
 * coloured by urgency (overdue red, due soon amber, later green). Tick a
 * reminder done, open its lead, or open its details to edit or delete it.
 */
export function RemindersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const calendar = useRemindersCalendar(t);
  const { view, cursor, events } = calendar;
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [selected, setSelected] = useState<Event | null>(null);

  // The month view lists the picked day; every other view lists its days.
  const groups = useMemo(
    () =>
      view === 'month'
        ? agendaDays(
            events.filter((e) => isSameDay(e.date, selectedDay)),
            'day',
            selectedDay,
          )
        : agendaDays(events, view, cursor),
    [events, view, cursor, selectedDay],
  );

  const changeView = (next: CalendarView) => {
    calendar.setView(next);
    if (next === 'month') setSelectedDay(cursor);
  };
  const changeCursor = (next: Date) => {
    calendar.setCursor(next);
    // In the month view, paging keeps a day of the shown month picked.
    if (view === 'month' && !isSameMonth(next, selectedDay))
      setSelectedDay(isSameMonth(next, new Date()) ? new Date() : startOfMonth(next));
  };
  const openLead = (event: Event) => {
    const kind = event.entity;
    const id = event.leadId;
    if (isLeadKind(kind) && id) navigation.navigate('LeadDetail', { kind, id });
  };

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: theme.background?.val }}
        data={groups}
        keyExtractor={(group) => format(group.day, 'yyyy-MM-dd')}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        refreshing={calendar.loading && calendar.loaded}
        onRefresh={calendar.refresh}
        ListHeaderComponent={
          <>
            <RemindersHeader
              view={view}
              cursor={cursor}
              entity={calendar.entity}
              status={calendar.status}
              followUpsError={calendar.followUpsError}
              onView={changeView}
              onCursor={changeCursor}
              onEntity={calendar.setEntity}
              onStatus={calendar.setStatus}
              onAdd={() => navigation.navigate('AddReminder', {})}
            />
            {view === 'month' ? (
              <RemindersMonthGrid
                cursor={cursor}
                events={events}
                selected={selectedDay}
                onSelect={setSelectedDay}
              />
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <RemindersDayGroup
            group={item}
            onChanged={calendar.refetchReminders}
            onDetails={setSelected}
            onOpenLead={openLead}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={!calendar.loaded && !calendar.error}
            error={calendar.error}
            empty={calendar.loaded ? t('crm.calendar.nothingScheduled') : null}
            onRetry={calendar.refresh}
          />
        }
      />
      <RemindersEventSheet
        event={selected}
        onClose={() => setSelected(null)}
        onChanged={calendar.refresh}
        onOpenLead={openLead}
      />
    </>
  );
}
