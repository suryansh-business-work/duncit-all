import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, YStack } from 'tamagui';

import { FilterChips } from '@/components/mobile/FilterChips';
import { EmptyState } from '@/components/mobile/EmptyState';
import { StateView } from '@/components/StateView';
import { SURFACE } from '@/components/surface';
import { MOBILE } from '@/constants/design';
import { VIEW_LABEL_KEY, type CalendarEvent } from '@/features/reminders/calendarView';
import { useCalendarAgenda } from '@/features/reminders/useCalendarAgenda';
import type { useRemindersCalendar } from '@/features/reminders/useRemindersCalendar';
import { isLeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { CalendarPeriodNav } from '@/screens/reminders/CalendarPeriodNav';
import type { ReminderItem } from '@/screens/reminders/ReminderRow';
import { RemindersDayGroup } from '@/screens/reminders/RemindersDayGroup';
import { RemindersEventSheet } from '@/screens/reminders/RemindersEventSheet';
import { RemindersMonthGrid } from '@/screens/reminders/RemindersMonthGrid';

/** The views Home offers; the full Reminders tab adds Year and Upcoming. */
const HOME_VIEWS = ['day', 'week', 'month'] as const;
type HomeView = (typeof HOME_VIEWS)[number];

type Event = CalendarEvent<ReminderItem>;

interface Props {
  calendar: ReturnType<typeof useRemindersCalendar>;
}

/**
 * Home's calendar: today, this week or this month of reminders and lead
 * follow-ups, paged with previous / Today / next, the month as a grid that
 * picks a day. Tick a reminder done, open its lead or its details right here.
 */
export function HomeCalendar({ calendar }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const agenda = useCalendarAgenda(calendar);
  const [selected, setSelected] = useState<Event | null>(null);
  const { view, cursor, events } = calendar;
  const homeView: HomeView = HOME_VIEWS.find((v) => v === view) ?? 'day';
  const openLead = (event: Event) => {
    const kind = event.entity;
    const id = event.leadId;
    if (isLeadKind(kind) && id) navigation.navigate('LeadDetail', { kind, id });
  };

  return (
    <YStack gap="$2" testID="home-calendar">
      <Text fontWeight="700" fontSize="$6" role="heading" paddingHorizontal="$1">
        {t('crmApp.home.calendar')}
      </Text>
      <YStack marginHorizontal={-MOBILE.gutter}>
        <FilterChips
          label={t('shell.common.view')}
          options={HOME_VIEWS.map((v) => ({ key: v, label: t(VIEW_LABEL_KEY[v]) }))}
          value={homeView}
          onChange={agenda.changeView}
          testID="home-calendar-view"
        />
      </YStack>
      <CalendarPeriodNav view={homeView} cursor={cursor} onCursor={agenda.changeCursor} />
      {homeView === 'month' ? (
        <RemindersMonthGrid
          cursor={cursor}
          events={events}
          selected={agenda.selectedDay}
          onSelect={agenda.setSelectedDay}
        />
      ) : null}
      <StateView
        loading={!calendar.loaded && !calendar.error}
        error={calendar.error}
        onRetry={calendar.refresh}
        rows={2}
      />
      {calendar.loaded && agenda.groups.length === 0 ? (
        <YStack {...SURFACE}>
          <EmptyState icon="event-available" title={t('crm.calendar.nothingScheduled')} />
        </YStack>
      ) : null}
      {agenda.groups.map((group) => (
        <RemindersDayGroup
          key={format(group.day, 'yyyy-MM-dd')}
          group={group}
          onChanged={calendar.refetchReminders}
          onDetails={setSelected}
          onOpenLead={openLead}
        />
      ))}
      <RemindersEventSheet
        event={selected}
        onClose={() => setSelected(null)}
        onChanged={calendar.refresh}
        onOpenLead={openLead}
      />
    </YStack>
  );
}
