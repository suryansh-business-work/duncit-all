import { Text, XStack, YStack } from 'tamagui';
import { slotSpanLabel } from '@duncit/slots';

import { DuncitButton } from '@/components/DuncitButton';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { VenueSlot } from '@/hooks/useOwnerVenueSlots';
import { useTranslation } from '@/hooks/useTranslation';
import { SLOT_STATUS_TONE, slotPriceLabel, slotStatusTone } from './slot-labels';

// PENDING = a live booking request; decide it in Slot Requests, don't edit it.
const LOCKED_STATUSES = new Set(['BOOKED', 'PENDING']);

interface Props {
  slot: VenueSlot;
  busy: boolean;
  onToggleBlock: (slot: VenueSlot) => void;
  onDelete: (slot: VenueSlot) => void;
}

/** One published slot in the day sheet, with block/unblock + delete unless a
 * pod holds it. The Tamagui twin of the MUI SlotList row (rule 27). */
export function DaySlotRow({ slot, busy, onToggleBlock, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const tone = slotStatusTone(slot.status);
  const blocked = slot.status === 'BLOCKED';
  // The shared when-sentence, whole-day and multi-day aware (rule 40).
  const when = slotSpanLabel(
    slot.start_at,
    slot.end_at,
    slot.whole_day,
    fmt,
    t('availability.wholeDay'),
  );
  const holds = slot.capacity
    ? t('availability.holdsCapacity', { vars: { capacity: slot.capacity } })
    : '';
  const spaceLine = [slot.space_label, holds].filter(Boolean).join(' · ');
  let podLine: string | null = null;
  if (slot.booked_pod_title) {
    const prefix =
      slot.status === 'PENDING' ? t('availability.requestedByPod') : t('availability.bookedByPod');
    podLine = `${prefix}: ${slot.booked_pod_title}`;
  }

  return (
    <YStack
      testID={`day-slot-${slot.id}`}
      gap={4}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={14} fontWeight="600" color="$color">
          {when}
        </Text>
        <Text fontSize={13} fontWeight="700" color="$color">
          {slotPriceLabel(slot.price, t)}
        </Text>
        <XStack
          testID={`day-slot-${slot.id}-status`}
          paddingHorizontal={10}
          paddingVertical={3}
          borderRadius={999}
          borderWidth={1}
          borderColor={tone}
        >
          <Text fontSize={11} fontWeight="600" color={tone}>
            {slot.status}
          </Text>
        </XStack>
      </XStack>
      {spaceLine ? (
        <Text fontSize={12} color="$muted">
          {spaceLine}
        </Text>
      ) : null}
      {podLine ? (
        <Text fontSize={12} color="$muted">
          {podLine}
        </Text>
      ) : null}
      {slot.status === 'PENDING' ? (
        <Text fontSize={12} color={SLOT_STATUS_TONE.PENDING}>
          {t('availability.awaitingDecision')}
        </Text>
      ) : null}
      {slot.notes ? (
        <Text fontSize={12} color="$color">
          {slot.notes}
        </Text>
      ) : null}
      {LOCKED_STATUSES.has(slot.status) ? null : (
        <XStack gap={8} paddingTop={4}>
          <DuncitButton
            testID={`day-slot-${slot.id}-block`}
            label={blocked ? t('availability.unblock') : t('availability.block')}
            onPress={() => onToggleBlock(slot)}
            variant="outline"
            tone="neutral"
            size="sm"
            disabled={busy}
          />
          <DuncitButton
            testID={`day-slot-${slot.id}-delete`}
            label={t('availability.delete')}
            onPress={() => onDelete(slot)}
            variant="ghost"
            tone="danger"
            size="sm"
            disabled={busy}
          />
        </XStack>
      )}
    </YStack>
  );
}
