import { Text, XStack, YStack } from 'tamagui';

import { addMonths, buildMonthGrid, clampMonth, monthKeyOf, weekdayInitials } from '@duncit/slots';

import { PRESS_STYLE } from '@duncit/buttons-native';
import { MonthNav } from './MonthNav';
import { WeekdayHeader } from './WeekdayHeader';

export interface SlotMonthGridProps {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  activeDay: string;
  enabledDays: ReadonlySet<string>;
  onPickDay: (dayKey: string) => void;
  bounds: { first: string; last: string } | null;
  fmt: Readonly<{ formatPattern: (input: Date, pattern: string) => string }>;
  labels: Readonly<{ previousMonth: string; nextMonth: string }>;
}

/**
 * The hand-drawn month grid — MUIX's DateCalendar has no React Native build, so
 * this is the Tamagui half of the pair. It renders from the same
 * `buildMonthGrid` / day-key helpers the MUI calendar uses, so both agree on
 * which days exist, which are enabled and which is selected.
 */
export default function SlotMonthGrid({
  monthKey,
  onMonthChange,
  activeDay,
  enabledDays,
  onPickDay,
  bounds,
  fmt,
  labels,
}: Readonly<SlotMonthGridProps>) {
  const weeks = buildMonthGrid(monthKey);
  const initials = weekdayInitials(fmt);
  const firstMonth = bounds ? monthKeyOf(bounds.first) : monthKey;
  const lastMonth = bounds ? monthKeyOf(bounds.last) : monthKey;
  const canGoBack = monthKey > firstMonth;
  const canGoNext = monthKey < lastMonth;
  const title = fmt.formatPattern(new Date(`${monthKey}-01T00:00:00`), 'MMMM yyyy');

  const step = (delta: number) => {
    onMonthChange(clampMonth(addMonths(monthKey, delta), firstMonth, lastMonth));
  };

  return (
    <YStack gap={4} testID="slot-month-grid">
      <MonthNav
        title={title}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
        onStep={step}
        labels={labels}
        testIDPrefix="slot-month"
      />

      <WeekdayHeader initials={initials} />

      {/* The grid is deterministic for a given month, so a coordinate key is
       * stable — there is no reordering for an index-based key to break. */}
      {weeks.map((week, weekIndex) => (
        <XStack key={`${monthKey}-w${weekIndex}`}>
          {week.map((dayKey, column) => {
            if (!dayKey) {
              return <YStack key={`${monthKey}-w${weekIndex}-c${column}`} flex={1} />;
            }
            const enabled = enabledDays.has(dayKey);
            const selected = dayKey === activeDay;
            return (
              <YStack key={dayKey} flex={1} alignItems="center" paddingVertical={2}>
                <YStack
                  testID={`slot-day-${dayKey}`}
                  role="button"
                  aria-label={dayKey}
                  aria-pressed={selected}
                  aria-disabled={!enabled}
                  onPress={() => {
                    if (enabled) onPickDay(dayKey);
                  }}
                  width={36}
                  height={36}
                  borderRadius={18}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={selected ? '$primary' : 'transparent'}
                  opacity={enabled || selected ? 1 : 0.35}
                  pressStyle={enabled ? PRESS_STYLE.control : undefined}
                >
                  <Text
                    fontSize={13}
                    fontWeight={selected ? '700' : '600'}
                    color={selected ? '$onPrimary' : '$color'}
                  >
                    {Number(dayKey.slice(8, 10))}
                  </Text>
                </YStack>
                <YStack
                  width={4}
                  height={4}
                  borderRadius={2}
                  marginTop={1}
                  backgroundColor={enabled && !selected ? '$primary' : 'transparent'}
                />
              </YStack>
            );
          })}
        </XStack>
      ))}
    </YStack>
  );
}
