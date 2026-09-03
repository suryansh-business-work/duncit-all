import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { addMonths, buildMonthGrid, monthKeyOf, weekdayInitials } from '@duncit/slots';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { WeekdayHeader } from '@/components/slots/WeekdayHeader';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AvailabilityDayCell } from './AvailabilityDayCell';
import { dayCellState, type DayCounts } from './availability-grid';

interface ArrowProps {
  testID: string;
  label: string;
  icon: 'chevron-left' | 'chevron-right';
  enabled: boolean;
  tint: string;
  onPress: () => void;
}

/** One of the two month arrows; inert and dimmed at the window's edge. */
function MonthArrow({ testID, label, icon, enabled, tint, onPress }: Readonly<ArrowProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={!enabled}
      onPress={enabled ? onPress : undefined}
      width={36}
      height={36}
      alignItems="center"
      justifyContent="center"
      opacity={enabled ? 1 : 0.3}
      pressStyle={PRESS_STYLE.inline}
    >
      <MaterialIcons name={icon} size={24} color={tint} />
    </XStack>
  );
}

interface Props {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  counts: ReadonlyMap<string, DayCounts>;
  holidays: ReadonlySet<string>;
  todayKey: string;
  /** The last day availability may be published on; later days are inert. */
  lastKey: string;
  selectedDay: string | null;
  onPickDay: (dayKey: string) => void;
}

/**
 * The venue owner's month at a glance — the Tamagui twin of the MUI
 * AvailabilityCalendar's month view (rule 27). Built on the same
 * `buildMonthGrid` the slot picker uses, so both calendars agree on which days
 * exist; each cell carries the A / P / B / × counts the legend explains.
 */
export function AvailabilityMonthGrid({
  monthKey,
  onMonthChange,
  counts,
  holidays,
  todayKey,
  lastKey,
  selectedDay,
  onPickDay,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { muted } = useThemeColors();
  const weeks = buildMonthGrid(monthKey);
  const canGoNext = monthKey < monthKeyOf(lastKey);
  const title = fmt.formatPattern(new Date(`${monthKey}-01T00:00:00`), 'MMMM yyyy');
  const leaveTag = t('availability.leaveTag');

  return (
    <YStack gap={6} testID="availability-month-grid">
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={4}>
        <MonthArrow
          testID="availability-month-prev"
          label={t('availability.toolbar.previous')}
          icon="chevron-left"
          enabled
          tint={muted}
          onPress={() => onMonthChange(addMonths(monthKey, -1))}
        />
        <Text fontSize={14} fontWeight="600" color="$color">
          {title}
        </Text>
        <MonthArrow
          testID="availability-month-next"
          label={t('availability.toolbar.next')}
          icon="chevron-right"
          enabled={canGoNext}
          tint={muted}
          onPress={() => onMonthChange(addMonths(monthKey, 1))}
        />
      </XStack>

      <WeekdayHeader initials={weekdayInitials(fmt)} />

      {/* The grid is deterministic for a given month, so a coordinate key is
       * stable — there is no reordering for an index-based key to break. */}
      {weeks.map((week, weekIndex) => (
        <XStack key={`${monthKey}-w${weekIndex}`} gap={3}>
          {week.map((dayKey, column) => {
            if (!dayKey) {
              return <YStack key={`${monthKey}-w${weekIndex}-c${column}`} flex={1} />;
            }
            return (
              <AvailabilityDayCell
                key={dayKey}
                dayKey={dayKey}
                counts={counts.get(dayKey)}
                state={dayCellState(dayKey, todayKey, lastKey, holidays)}
                selected={dayKey === selectedDay}
                isToday={dayKey === todayKey}
                leaveTag={leaveTag}
                onPress={onPickDay}
              />
            );
          })}
        </XStack>
      ))}
    </YStack>
  );
}
