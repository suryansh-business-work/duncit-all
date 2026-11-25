import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { formatDate } from '@duncit/datetime';
import { crmDueUrgency, type CrmCalendarReminder, type CrmDueUrgency } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

import { RADII } from '@/constants/design';
import { monthGridDays, type CalendarEvent } from '@/features/reminders/calendarView';
import { useTranslation } from '@/hooks/useTranslation';

/** The urgency colours of the portal's event pills. */
const DOT: Record<CrmDueUrgency, string> = {
  done: '$muted',
  overdue: '$danger',
  soon: '$warning',
  later: '$success',
};

/** A day cell shows this many events as dots, then "+N". */
const MAX_DOTS = 3;

interface Props<R extends CrmCalendarReminder> {
  cursor: Date;
  events: readonly CalendarEvent<R>[];
  selected: Date;
  onSelect: (day: Date) => void;
}

/**
 * The month view: six weeks of days, each with a dot per event in its urgency
 * colour (and "+N" beyond three). Tap a day to list its events below — the
 * portal's month grid, readable on a phone.
 */
export function RemindersMonthGrid<R extends CrmCalendarReminder>({
  cursor,
  events,
  selected,
  onSelect,
}: Readonly<Props<R>>) {
  const { t } = useTranslation();
  const days = monthGridDays(cursor);
  return (
    <YStack gap="$1" testID="calendar-month">
      <XStack>
        {days.slice(0, 7).map((day) => (
          <Text
            key={day.toISOString()}
            flex={1}
            textAlign="center"
            color="$muted"
            fontSize="$1"
            fontWeight="700"
          >
            {format(day, 'EEE')}
          </Text>
        ))}
      </XStack>
      <XStack flexWrap="wrap">
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(e.date, day));
          const picked = isSameDay(day, selected);
          return (
            <YStack
              key={day.toISOString()}
              width="14.28%"
              minHeight={52}
              padding="$1"
              alignItems="center"
              gap="$1"
              role="button"
              aria-label={t('crmApp.reminder.dayEvents', {
                vars: { day: formatDate(day) },
                count: dayEvents.length,
              })}
              aria-selected={picked}
              aria-current={isToday(day) ? 'date' : undefined}
              onPress={() => onSelect(day)}
              borderRadius={RADII.sm}
              backgroundColor={picked ? '$primarySoft' : 'transparent'}
              opacity={isSameMonth(day, cursor) ? 1 : 0.55}
              testID={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
            >
              <Text
                fontWeight={isToday(day) ? '800' : '500'}
                color={isToday(day) ? '$accentText' : '$color'}
              >
                {format(day, 'd')}
              </Text>
              <XStack gap={2} alignItems="center">
                {dayEvents.slice(0, MAX_DOTS).map((e) => (
                  <YStack
                    key={e.id}
                    width={6}
                    height={6}
                    borderRadius={RADII.pill}
                    backgroundColor={DOT[crmDueUrgency(e.date, e.status === 'DONE')]}
                  />
                ))}
                {dayEvents.length > MAX_DOTS ? (
                  <Text fontSize="$1" color="$muted">{`+${dayEvents.length - MAX_DOTS}`}</Text>
                ) : null}
              </XStack>
            </YStack>
          );
        })}
      </XStack>
    </YStack>
  );
}
