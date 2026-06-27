import { useState } from 'react';
import { ScrollView } from 'react-native';
import { addMonths, format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { buildMonthDays } from '@/components/create-pod/DateTimeSheet';

const YEAR_SPAN = 120;

/** Descending list of selectable birth years (this year back ~120 years). */
export function buildYears(maxYear: number): number[] {
  return Array.from({ length: YEAR_SPAN + 1 }, (_, i) => maxYear - i);
}

interface SheetProps {
  testID: string;
  initial: Date | null;
  muted: string;
  maxDate: Date;
  onDone: (picked: Date) => void;
}

/** Day cell — hoisted to module scope (S6478). */
function DayCell({
  testID,
  day,
  selected,
  disabled,
  onPick,
}: Readonly<{
  testID?: string;
  day: number | null;
  selected: boolean;
  disabled: boolean;
  onPick: (() => void) | undefined;
}>) {
  if (!day) {
    return <YStack width="14.28%" height={38} />;
  }
  const ink = selected ? '$onPrimary' : '$color';
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={`Day ${day}`}
      aria-disabled={disabled}
      onPress={onPick}
      width="14.28%"
      height={38}
      alignItems="center"
      justifyContent="center"
      opacity={disabled ? 0.35 : 1}
    >
      <YStack
        width={32}
        height={32}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor={selected ? '$primary' : '$borderColor'}
        backgroundColor={selected ? '$primary' : 'transparent'}
      >
        <Text fontSize={13} fontWeight="700" color={ink}>
          {day}
        </Text>
      </YStack>
    </YStack>
  );
}

/**
 * Date-only birth-date sheet (bug 1) — fast year selection that is editable (type
 * the year to filter the chips, then tap it), month navigation and a day grid.
 * Future days are blocked so only a valid past date can be picked.
 */
export function DobCalendarSheet({
  testID,
  initial,
  muted,
  maxDate,
  onDone,
}: Readonly<SheetProps>) {
  const seed = initial ?? maxDate;
  const [view, setView] = useState(new Date(seed.getFullYear(), seed.getMonth(), 1));
  const [day, setDay] = useState(seed.getDate());
  const [yearQuery, setYearQuery] = useState('');

  const years = buildYears(maxDate.getFullYear());
  const term = yearQuery.trim();
  const visibleYears = term ? years.filter((y) => String(y).includes(term)) : years;
  const days = buildMonthDays(view.getFullYear(), view.getMonth());

  const isFuture = (d: number) =>
    new Date(view.getFullYear(), view.getMonth(), d).getTime() > maxDate.getTime();

  const pickYear = (year: number) => {
    setView((v) => new Date(year, v.getMonth(), 1));
    setYearQuery('');
  };

  return (
    <YStack gap={12}>
      <Text fontSize={12} fontWeight="900" color="$muted">
        YEAR
      </Text>
      <XStack
        alignItems="center"
        gap={6}
        height={38}
        paddingHorizontal={10}
        borderRadius={10}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <MaterialIcons name="search" size={16} color={muted} />
        <Input
          testID={`${testID}-year-search`}
          flex={1}
          unstyled
          keyboardType="number-pad"
          value={yearQuery}
          onChangeText={setYearQuery}
          placeholder="Type a year"
          placeholderTextColor="$muted"
          fontSize={13}
          color="$color"
        />
      </XStack>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={6}>
          {visibleYears.map((y) => {
            const selected = y === view.getFullYear();
            return (
              <YStack
                key={y}
                testID={`${testID}-year-${y}`}
                role="button"
                aria-label={`Year ${y}`}
                onPress={() => pickYear(y)}
                paddingHorizontal={12}
                paddingVertical={7}
                borderRadius={999}
                borderWidth={1}
                borderColor={selected ? '$primary' : '$borderColor'}
                backgroundColor={selected ? '$primary' : 'transparent'}
              >
                <Text fontSize={12.5} fontWeight="800" color={selected ? '$onPrimary' : '$color'}>
                  {y}
                </Text>
              </YStack>
            );
          })}
          {visibleYears.length === 0 ? (
            <Text fontSize={13} color="$muted">
              No matching years.
            </Text>
          ) : null}
        </XStack>
      </ScrollView>

      <XStack alignItems="center" justifyContent="space-between">
        <XStack
          testID={`${testID}-prev-month`}
          role="button"
          aria-label="Previous month"
          onPress={() => setView((v) => addMonths(v, -1))}
          padding={8}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="chevron-left" size={22} color={muted} />
        </XStack>
        <Text fontSize={15} fontWeight="900" color="$color">
          {format(view, 'MMMM yyyy')}
        </Text>
        <XStack
          testID={`${testID}-next-month`}
          role="button"
          aria-label="Next month"
          onPress={() => setView((v) => addMonths(v, 1))}
          padding={8}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="chevron-right" size={22} color={muted} />
        </XStack>
      </XStack>
      <XStack flexWrap="wrap">
        {days.map((d, index) => {
          const disabled = d ? isFuture(d) : false;
          return (
            <DayCell
              // eslint-disable-next-line react/no-array-index-key -- leading blanks repeat null
              key={`${view.getMonth()}-${index}`}
              testID={d ? `${testID}-day-${d}` : undefined}
              day={d}
              selected={d === day}
              disabled={disabled}
              onPick={d && !disabled ? () => setDay(d) : undefined}
            />
          );
        })}
      </XStack>

      <XStack
        testID={`${testID}-done`}
        role="button"
        aria-label="Done"
        onPress={() => onDone(new Date(view.getFullYear(), view.getMonth(), day))}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="900" color="$onPrimary">
          Done
        </Text>
      </XStack>
    </YStack>
  );
}
