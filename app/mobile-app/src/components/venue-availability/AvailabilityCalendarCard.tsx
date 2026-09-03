import { Spinner, Text, YStack } from 'tamagui';

import { AvailabilityGrid } from './AvailabilityGrid';
import { AvailabilityLegend } from './AvailabilityLegend';
import { AvailabilityToolbar } from './AvailabilityToolbar';
import type { CalendarView, DayCounts } from './availability-grid';

interface Props {
  view: CalendarView;
  onView: (view: CalendarView) => void;
  /** The instant the active period is built around. */
  anchor: Date;
  periodLabel: string;
  onShift: (direction: 1 | -1) => void;
  canGoNext: boolean;
  onToday: () => void;
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

/** The calendar card: the toolbar, the period's grid and its legend — the
 * body of the MUI VenueAvailabilityEditor's card (rule 27). */
export function AvailabilityCalendarCard({
  view,
  onView,
  anchor,
  periodLabel,
  onShift,
  canGoNext,
  onToday,
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
      <AvailabilityToolbar
        view={view}
        onView={onView}
        periodLabel={periodLabel}
        onShift={onShift}
        canGoNext={canGoNext}
        onToday={onToday}
        onRecurring={onRecurring}
      />
      {error ? (
        <Text testID="availability-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      {isLoading ? <Spinner testID="availability-loading" color="$primary" /> : null}
      <AvailabilityGrid
        view={view}
        anchor={anchor}
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
