import { MaterialIcons } from '@expo/vector-icons';
import { format, isToday } from 'date-fns';
import { formatDate, formatTime } from '@duncit/datetime';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { SURFACE } from '@/components/surface';
import type { AgendaDay, CalendarEvent } from '@/features/reminders/calendarView';
import { useTranslation } from '@/hooks/useTranslation';
import { ReminderRow, type ReminderItem } from './ReminderRow';

interface Props {
  group: AgendaDay<ReminderItem>;
  onChanged: () => void;
  onDetails: (event: CalendarEvent<ReminderItem>) => void;
  onOpenLead: (event: CalendarEvent<ReminderItem>) => void;
}

/** A lead's next follow-up on the calendar: read-only, opens the lead, details on the side. */
function FollowUpRow({
  event,
  onOpen,
  onDetails,
}: Readonly<{ event: CalendarEvent<ReminderItem>; onOpen: () => void; onDetails: () => void }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <XStack gap="$3" paddingVertical="$2" alignItems="center" testID={`followup-${event.id}`}>
      <MaterialIcons name="event" size={24} color={theme.accentText?.val} />
      <YStack flex={1} role="link" onPress={onOpen}>
        <Text fontWeight="600">{event.title}</Text>
        <Text color="$muted" fontSize="$2">
          {formatTime(event.date)}
        </Text>
      </YStack>
      <XStack
        role="button"
        aria-label={t('crmApp.reminder.details', { vars: { title: event.title } })}
        onPress={onDetails}
        padding="$2"
        hitSlop={8}
        testID={`followup-details-${event.id}`}
      >
        <MaterialIcons name="more-vert" size={22} color={theme.muted?.val} />
      </XStack>
    </XStack>
  );
}

/** One day of a list view (Day, Week, Year, Upcoming, a picked month day) and its events. */
export function RemindersDayGroup({ group, onChanged, onDetails, onOpenLead }: Readonly<Props>) {
  const today = isToday(group.day);
  return (
    <YStack {...SURFACE} gap="$1" testID={`calendar-group-${format(group.day, 'yyyy-MM-dd')}`}>
      <Text fontWeight="800" color={today ? '$accentText' : '$color'} role="heading">
        {`${format(group.day, 'EEE')}, ${formatDate(group.day)}`}
      </Text>
      {group.events.map((event) =>
        event.reminder ? (
          <ReminderRow
            key={event.id}
            reminder={event.reminder}
            onChanged={onChanged}
            onDetails={() => onDetails(event)}
          />
        ) : (
          <FollowUpRow
            key={event.id}
            event={event}
            onOpen={() => onOpenLead(event)}
            onDetails={() => onDetails(event)}
          />
        ),
      )}
    </YStack>
  );
}
