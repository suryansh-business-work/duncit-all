import { useState } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import {
  groupSlotsByDay,
  resolveSlotDay,
  slotDayBounds,
  slotDayKeys,
  slotPriceLabel,
  slotTimeLabel,
} from '../group';
import { monthKeyOf } from '../month';
import type { CalendarSlot, SlotFormatter, SlotLabels } from '../types';
import SlotMonthGrid from './SlotMonthGrid';

export interface SlotCalendarProps {
  slots: readonly CalendarSlot[];
  loading?: boolean;
  error?: string | null;
  selectedSlotId: string;
  onPick: (slot: CalendarSlot) => void;
  fmt: SlotFormatter & { formatPattern: (input: Date, pattern: string) => string };
  labels: Readonly<SlotLabels>;
  required?: boolean;
  showPrice?: boolean;
}

/**
 * Pick a date on a calendar, then a time on that date — the Tamagui twin of
 * ../mui/SlotCalendar. Same steps, same order, same copy, same helpers; only the
 * toolkit differs, because MUIX does not run under React Native.
 */
export default function SlotCalendar({
  slots,
  loading = false,
  error,
  selectedSlotId,
  onPick,
  fmt,
  labels,
  required = false,
  showPrice = true,
}: Readonly<SlotCalendarProps>) {
  const [override, setOverride] = useState<string | null>(null);
  const [monthOverride, setMonthOverride] = useState<string | null>(null);

  const days = groupSlotsByDay(slots, fmt);
  const enabledDays = slotDayKeys(days);
  const bounds = slotDayBounds(days);
  const { activeDay, daySlots } = resolveSlotDay(days, selectedSlotId, override);
  const monthKey = monthOverride ?? (activeDay ? monthKeyOf(activeDay) : '');

  if (loading && days.length === 0) {
    return (
      <YStack gap={8} alignItems="center" paddingVertical={16} testID="slot-calendar-loading">
        <Spinner color="$primary" />
        <Text fontSize={12} color="$muted">
          {labels.loading}
        </Text>
      </YStack>
    );
  }

  if (days.length === 0) {
    return (
      <YStack gap={6}>
        <Text testID="slot-calendar-empty" fontSize={13} color="$muted">
          {labels.empty}
        </Text>
        {error ? (
          <Text fontSize={12.5} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    );
  }

  return (
    <YStack gap={10} testID="slot-calendar">
      <YStack gap={2}>
        <Text fontSize={14} fontWeight="800" color="$color">
          {labels.date}
          {required ? <Text color="$danger"> *</Text> : null}
        </Text>
        <Text fontSize={12} color="$muted">
          {labels.hint}
        </Text>
      </YStack>

      <SlotMonthGrid
        monthKey={monthKey}
        onMonthChange={setMonthOverride}
        activeDay={activeDay}
        enabledDays={enabledDays}
        onPickDay={(day) => {
          setOverride(day);
          setMonthOverride(monthKeyOf(day));
        }}
        bounds={bounds}
        fmt={fmt}
        labels={labels}
      />

      <YStack gap={6}>
        <Text fontSize={14} fontWeight="800" color="$color">
          {labels.availableSlots}
        </Text>
        {daySlots.length > 0 ? (
          <XStack flexWrap="wrap" gap={8}>
            {daySlots.map((slot) => {
              const selected = slot.id === selectedSlotId;
              const price = showPrice ? slotPriceLabel(slot.price, labels.free) : '';
              const time = slotTimeLabel(slot.start_at, fmt);
              const secondary = price || slot.caption || '';
              return (
                <YStack
                  key={slot.id}
                  testID={`slot-tile-${slot.id}`}
                  role="button"
                  aria-label={secondary ? `${time} ${secondary}` : time}
                  aria-pressed={selected}
                  aria-disabled={slot.disabled}
                  onPress={() => {
                    if (!slot.disabled) onPick(slot);
                  }}
                  minWidth={96}
                  paddingHorizontal={12}
                  paddingVertical={8}
                  borderRadius={12}
                  borderWidth={selected ? 2 : 1}
                  borderColor={selected ? '$primary' : '$borderColor'}
                  backgroundColor={selected ? '$primary' : '$surface'}
                  opacity={slot.disabled ? 0.45 : 1}
                  alignItems="center"
                  pressStyle={slot.disabled ? undefined : { opacity: 0.7 }}
                >
                  <Text
                    fontSize={14}
                    fontWeight="900"
                    color={selected ? '$onPrimary' : '$color'}
                  >
                    {time}
                  </Text>
                  {secondary ? (
                    <Text fontSize={11.5} color={selected ? '$onPrimary' : '$muted'}>
                      {secondary}
                    </Text>
                  ) : null}
                </YStack>
              );
            })}
          </XStack>
        ) : (
          <Text testID="slot-calendar-empty-day" fontSize={13} color="$muted">
            {labels.emptyDay}
          </Text>
        )}
      </YStack>

      {error ? (
        <Text testID="slot-calendar-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
