import { useState } from 'react';
import { addMonths, format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { buildMonthDays } from '@/components/create-pod/DateTimeSheet';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DayCell } from './DayCell';
import { YearPicker } from './YearPicker';

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
  const { t } = useTranslation();
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
      <YearPicker
        testID={testID}
        muted={muted}
        yearQuery={yearQuery}
        onYearQuery={setYearQuery}
        visibleYears={visibleYears}
        selectedYear={view.getFullYear()}
        onPick={pickYear}
      />

      <XStack alignItems="center" justifyContent="space-between">
        <XStack
          testID={`${testID}-prev-month`}
          role="button"
          aria-label={t('mweb.accountEdit.previousMonth')}
          tabIndex={0}
          onPress={() => setView((v) => addMonths(v, -1))}
          padding={8}
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="chevron-left" size={22} color={muted} />
        </XStack>
        <Text fontSize={15} fontWeight="700" color="$color">
          {format(view, 'MMMM yyyy')}
        </Text>
        <XStack
          testID={`${testID}-next-month`}
          role="button"
          aria-label={t('mweb.accountEdit.nextMonth')}
          tabIndex={0}
          onPress={() => setView((v) => addMonths(v, 1))}
          padding={8}
          pressStyle={PRESS_STYLE.row}
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
        aria-label={t('mweb.common.done')}
        tabIndex={0}
        onPress={() => onDone(new Date(view.getFullYear(), view.getMonth(), day))}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor="$primary"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          Done
        </Text>
      </XStack>
    </YStack>
  );
}
