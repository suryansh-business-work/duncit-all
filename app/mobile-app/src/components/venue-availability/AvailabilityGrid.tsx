import { XStack, YStack } from 'tamagui';
import { weekdayInitials } from '@duncit/slots';

import { WeekdayHeader } from '@/components/slots/WeekdayHeader';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { AvailabilityDayCell } from './AvailabilityDayCell';
import { dayCellState, viewCells, type CalendarView, type DayCounts } from './availability-grid';

interface Props {
  view: CalendarView;
  /** The instant the active period is built around. */
  anchor: Date;
  counts: ReadonlyMap<string, DayCounts>;
  holidays: ReadonlySet<string>;
  todayKey: string;
  /** The last day availability may be published on; later days are inert. */
  lastKey: string;
  selectedDay: string | null;
  onPickDay: (dayKey: string) => void;
}

/**
 * The venue owner's period at a glance — a single day, the anchor's week or
 * the whole month — the Tamagui twin of the MUI AvailabilityCalendar (rule 27).
 * Built on the same `buildMonthGrid` the slot picker uses, so both calendars
 * agree on which days exist; each cell carries the A / P / B / × counts the
 * legend explains.
 */
export function AvailabilityGrid({
  view,
  anchor,
  counts,
  holidays,
  todayKey,
  lastKey,
  selectedDay,
  onPickDay,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const rows = viewCells(view, anchor);
  const dayView = view === 'day';
  const leaveTag = t('availability.leaveTag');
  const leaveNote = t('availability.onLeaveNotBookable');

  return (
    <YStack gap={6} testID="availability-grid">
      {dayView ? null : <WeekdayHeader initials={weekdayInitials(fmt)} />}

      {/* A row is keyed on its first day: a period's rows never reorder, and
       * every row holds at least one day. A padding cell has no day, so its
       * column is the only stable identity it has. */}
      {rows.map((row) => {
        const rowKey = row.find(Boolean) ?? '';
        return (
          <XStack key={rowKey} gap={3}>
            {row.map((dayKey, column) => {
              if (!dayKey) return <YStack key={`${rowKey}-c${column}`} flex={1} />;
              const state = dayCellState(dayKey, todayKey, lastKey, holidays);
              const label = dayView ? fmt.formatDay(dayKey) : String(Number(dayKey.slice(8, 10)));
              const note = dayView && state === 'holiday' ? leaveNote : undefined;
              return (
                <AvailabilityDayCell
                  key={dayKey}
                  dayKey={dayKey}
                  label={label}
                  note={note}
                  counts={counts.get(dayKey)}
                  state={state}
                  selected={dayKey === selectedDay}
                  isToday={dayKey === todayKey}
                  leaveTag={leaveTag}
                  onPress={onPickDay}
                />
              );
            })}
          </XStack>
        );
      })}
    </YStack>
  );
}
