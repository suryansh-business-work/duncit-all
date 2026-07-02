import { format } from 'date-fns';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodSlot } from './create-pod.types';

interface Props {
  slots: CreatePodSlot[];
  loading: boolean;
  selectedSlotId: string;
  onPick: (slot: CreatePodSlot) => void;
  error?: string;
}

const slotLabel = (slot: CreatePodSlot) =>
  `${format(new Date(slot.start_at), 'h:mm a')} – ${format(new Date(slot.end_at), 'h:mm a')}${
    slot.price > 0 ? ` · ₹${slot.price}` : ' · Free'
  }`;

/** Available slots from the venue partner's calendar, grouped by day. */
export function SlotPicker({ slots, loading, selectedSlotId, onPick, error }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const byDay = new Map<string, CreatePodSlot[]>();
  for (const slot of slots) {
    const key = format(new Date(slot.start_at), 'yyyy-MM-dd');
    const bucket = byDay.get(key);
    if (bucket) bucket.push(slot);
    else byDay.set(key, [slot]);
  }
  const dayEntries = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="500" color="$color">
        Available slots
      </Text>
      <Text fontSize={12} color="$muted">
        From the venue's availability calendar — the slot decides your pod's date & time.
      </Text>
      {loading ? <Spinner testID="create-pod-slots-loading" color="$primary" /> : null}
      {!loading && dayEntries.length === 0 ? (
        <Text testID="create-pod-no-slots" fontSize={13} color="$muted">
          This venue has no open slots right now. Try another venue or check back later.
        </Text>
      ) : null}
      {dayEntries.map(([day, daySlots]) => (
        <YStack key={day} gap={6}>
          <Text fontSize={12.5} fontWeight="800" color="$muted">
            {format(new Date(`${day}T00:00:00`), 'EEE, d MMM yyyy')}
          </Text>
          <XStack flexWrap="wrap" gap={8}>
            {daySlots.map((slot) => {
              const selected = slot.id === selectedSlotId;
              return (
                <XStack
                  key={slot.id}
                  testID={`create-pod-slot-${slot.id}`}
                  role="button"
                  aria-label={slotLabel(slot)}
                  aria-pressed={selected}
                  onPress={() => onPick(slot)}
                  paddingHorizontal={12}
                  paddingVertical={8}
                  borderRadius={999}
                  borderWidth={1}
                  borderColor={selected ? '$primary' : '$borderColor'}
                  backgroundColor={selected ? '$primary' : '$surface'}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <Text fontSize={13} fontWeight="700" color={selected ? onPrimary : '$color'}>
                    {slotLabel(slot)}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        </YStack>
      ))}
      {error ? (
        <Text testID="create-pod-slot-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
