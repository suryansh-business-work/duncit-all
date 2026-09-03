import { Spinner, Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import { AvailabilityLegend } from './AvailabilityLegend';
import { AvailabilityMonthGrid } from './AvailabilityMonthGrid';
import type { DayCounts } from './availability-grid';

interface Props {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  counts: ReadonlyMap<string, DayCounts>;
  holidays: ReadonlySet<string>;
  todayKey: string;
  lastKey: string;
  selectedDay: string | null;
  onPickDay: (dayKey: string) => void;
  isLoading: boolean;
  error: string | null;
  onRecurring: () => void;
}

/** The calendar card: the recurring action, the month grid and its legend —
 * the body of the MUI VenueAvailabilityEditor's card (rule 27). */
export function AvailabilityCalendarCard({
  monthKey,
  onMonthChange,
  counts,
  holidays,
  todayKey,
  lastKey,
  selectedDay,
  onPickDay,
  isLoading,
  error,
  onRecurring,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack
      testID="availability-calendar"
      gap={12}
      padding={12}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" justifyContent="flex-end" gap={10}>
        {isLoading ? <Spinner testID="availability-loading" color="$primary" /> : null}
        <DuncitButton
          testID="availability-recurring"
          label={t('availability.toolbar.recurring')}
          onPress={onRecurring}
          variant="outline"
          size="sm"
        />
      </XStack>
      {error ? (
        <Text testID="availability-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      <AvailabilityMonthGrid
        monthKey={monthKey}
        onMonthChange={onMonthChange}
        counts={counts}
        holidays={holidays}
        todayKey={todayKey}
        lastKey={lastKey}
        selectedDay={selectedDay}
        onPickDay={onPickDay}
      />
      <AvailabilityLegend />
    </YStack>
  );
}
