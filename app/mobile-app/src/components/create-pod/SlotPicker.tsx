import { useState } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodSlot } from './create-pod.types';

interface Props {
  slots: CreatePodSlot[];
  loading: boolean;
  selectedSlotId: string;
  onPick: (slot: CreatePodSlot) => void;
  error?: string;
}

const dayKey = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

const dayLabel = (dayIso: string) => {
  const date = new Date(`${dayIso}T00:00:00`);
  if (isToday(date)) return `Today, ${format(date, 'MMM d')}`;
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
};

const priceLabel = (slot: CreatePodSlot) => (slot.price > 0 ? `₹${slot.price}` : 'Free');

/** Reskinned slot picker — a row of day chips over a grid of time tiles. The
 * chosen tile sets the pod's date & time. Mobile twin of mWeb's SlotPicker. */
export function SlotPicker({ slots, loading, selectedSlotId, onPick, error }: Readonly<Props>) {
  const { onPrimary, color } = useThemeColors();
  const byDay = new Map<string, CreatePodSlot[]>();
  for (const slot of slots) {
    const key = dayKey(slot.start_at);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(slot);
    else byDay.set(key, [slot]);
  }
  const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
  const selectedDay = slots.find((slot) => slot.id === selectedSlotId);
  const [override, setOverride] = useState<string | null>(null);
  const activeDay = override ?? (selectedDay ? dayKey(selectedDay.start_at) : (days[0] ?? ''));
  const daySlots = byDay.get(activeDay) ?? [];

  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="500" color="$color">
        Date
      </Text>
      <Text fontSize={12} color="$muted">
        From the venue's availability calendar — the slot decides your pod's date & time.
      </Text>
      {loading ? <Spinner testID="create-pod-slots-loading" color="$primary" /> : null}
      {!loading && days.length === 0 ? (
        <Text testID="create-pod-no-slots" fontSize={13} color="$muted">
          This venue has no open slots right now. Try another venue or check back later.
        </Text>
      ) : null}
      {days.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap={8} paddingRight={8}>
            {days.map((day) => {
              const active = day === activeDay;
              return (
                <XStack
                  key={day}
                  testID={`create-pod-day-${day}`}
                  role="button"
                  aria-label={dayLabel(day)}
                  aria-pressed={active}
                  onPress={() => setOverride(day)}
                  paddingHorizontal={14}
                  paddingVertical={8}
                  borderRadius={999}
                  borderWidth={1}
                  borderColor={active ? '$primary' : '$borderColor'}
                  backgroundColor={active ? '$primary' : '$surface'}
                  pressStyle={{ opacity: 0.8 }}
                >
                  <Text fontSize={13} fontWeight="800" color={active ? onPrimary : color}>
                    {dayLabel(day)}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        </ScrollView>
      ) : null}
      {daySlots.length > 0 ? (
        <YStack gap={6}>
          <Text fontSize={14} fontWeight="500" color="$color">
            Available slots
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {daySlots.map((slot) => {
              const selected = slot.id === selectedSlotId;
              return (
                <YStack
                  key={slot.id}
                  testID={`create-pod-slot-${slot.id}`}
                  role="button"
                  aria-label={`${format(new Date(slot.start_at), 'h:mm a')} ${priceLabel(slot)}`}
                  aria-pressed={selected}
                  onPress={() => onPick(slot)}
                  minWidth={96}
                  paddingHorizontal={12}
                  paddingVertical={8}
                  borderRadius={12}
                  borderWidth={selected ? 2 : 1}
                  borderColor={selected ? '$primary' : '$borderColor'}
                  backgroundColor={selected ? '$primary' : '$surface'}
                  alignItems="center"
                  pressStyle={{ opacity: 0.7 }}
                >
                  <Text fontSize={14} fontWeight="900" color={selected ? onPrimary : color}>
                    {format(new Date(slot.start_at), 'h:mm a')}
                  </Text>
                  <Text fontSize={11.5} color={selected ? onPrimary : '$muted'}>
                    {priceLabel(slot)}
                  </Text>
                </YStack>
              );
            })}
          </XStack>
        </YStack>
      ) : null}
      {error ? (
        <Text testID="create-pod-slot-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
