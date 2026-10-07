import { useMemo, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SlotPicker } from '@/components/create-pod/SlotPicker';
import { SelectChip } from '@/components/venue-availability/SelectChip';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueSlots } from '@/hooks/useVenueSlots';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  venueId: string;
  busy: boolean;
  /** Resolves true once the slot request is sent. */
  onSend: (slotId: string) => Promise<boolean>;
}

/**
 * The receiver picks one of the venue's open slots — the same calendar Create
 * Pod uses, one space at a time when the venue sells several — and sends it
 * for the other side to confirm. mWeb twin: PickSlotBlock.
 */
export function PickSlotBlock({ venueId, busy, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const [slotId, setSlotId] = useState('');
  const [space, setSpace] = useState<string | null>(null);
  const { slots, isLoading } = useVenueSlots(venueId);
  const spaces = useMemo(() => [...new Set(slots.map((slot) => slot.space_label ?? ''))], [slots]);
  const activeSpace = space ?? spaces[0] ?? '';
  const spaceSlots = slots.filter((slot) => (slot.space_label ?? '') === activeSpace);
  const noSlots = !isLoading && slots.length === 0;

  return (
    <YStack gap={14} testID="pod-request-pick-slot">
      <Text role="heading" fontSize={16} fontWeight="700" color="$color">
        {t('podRequests.pickSlot')}
      </Text>
      <Text fontSize={13} color="$muted">
        {t('podRequests.pickSlotHint')}
      </Text>
      {noSlots ? (
        <Text role="status" testID="pod-request-no-slots" fontSize={14} color="$muted">
          {t('podRequests.noSlots')}
        </Text>
      ) : null}
      {spaces.length > 1 ? (
        <YStack gap={8}>
          <Text fontSize={13} fontWeight="600" color="$color">
            {t('mweb.createPod.spaceCapacity')}
          </Text>
          <XStack
            gap={8}
            flexWrap="wrap"
            role="radiogroup"
            aria-label={t('mweb.createPod.spaceCapacity')}
          >
            {spaces.map((value) => (
              <SelectChip
                key={value || 'whole'}
                testID={`pod-request-space-${value || 'whole'}`}
                role="radio"
                label={value || t('mweb.slots.wholeVenue')}
                selected={value === activeSpace}
                onPress={() => {
                  setSpace(value);
                  setSlotId('');
                }}
              />
            ))}
          </XStack>
        </YStack>
      ) : null}
      {noSlots ? null : (
        <SlotPicker
          slots={spaceSlots}
          loading={isLoading}
          selectedSlotId={slotId}
          onPick={(slot) => setSlotId(slot.id)}
          required
        />
      )}
      <PrimaryButton
        testID="pod-request-send-slot"
        label={t('podRequests.sendSlot')}
        disabled={!slotId || busy}
        loading={busy}
        onPress={() => fireAndForget(onSend(slotId))}
      />
    </YStack>
  );
}
