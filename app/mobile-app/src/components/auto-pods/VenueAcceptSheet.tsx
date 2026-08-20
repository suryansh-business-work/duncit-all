import { Text, XStack, YStack } from 'tamagui';
import type { AutoPodLabels, AutoPodRow } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { useVenueAcceptAutoPod } from '@/hooks/useVenueAcceptAutoPod';

interface Props {
  row: AutoPodRow | null;
  labels: AutoPodLabels;
  onClose: () => void;
  onAccepted: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  /** Where this surface sends a venue with no free slots. */
  onAddAvailability?: () => void;
}

/**
 * Accepting an Auto Pod and committing a slot are ONE step: an acceptance with
 * no date would leave hosts and club admins nothing to enrol against. The venue
 * picks from slots it has already published — the slot is booked the instant
 * this succeeds and stays booked until the pod exists.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `VenueAcceptDialog` (rule 27); the
 * two pickers are chip columns rather than MUI selects, which is the pattern
 * every other native sheet uses for a short single-select list.
 */
export function VenueAcceptSheet({
  row,
  labels,
  onClose,
  onAccepted,
  formatWhen,
  formatMoney,
  onAddAvailability,
}: Readonly<Props>) {
  const accept = useVenueAcceptAutoPod(row?.id ?? null, labels, onAccepted);

  const venueOptions = accept.venues.map(
    (venue) => [venue.id, venue.venue_name] as readonly [string, string],
  );
  const slotOptions = accept.slots.map((slot) => {
    const space = slot.space_label ? ` · ${slot.space_label}` : '';
    return [
      slot.id,
      `${formatWhen(slot.start_at)}${space} · ${formatMoney(slot.price)}`,
    ] as readonly [string, string];
  });

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-accept-cancel"
          label={labels.dismiss}
          onPress={onClose}
          variant="ghost"
          disabled={false}
        />
      </YStack>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-accept-confirm"
          label={labels.acceptCta}
          onPress={() => {
            accept.accept().catch(() => undefined);
          }}
          variant="solid"
          disabled={!accept.venueId || !accept.slotId || accept.busy}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={!!row}
      onClose={onClose}
      testID="auto-pod-accept-sheet"
      title={labels.confirmAccept}
      subtitle={labels.confirmAcceptBody}
      closeLabel={labels.dismiss}
      footer={footer}
    >
      <YStack gap={14}>
        {row ? (
          <Text fontSize={14} fontWeight="700" color="$color">
            {row.pod_title}
          </Text>
        ) : null}

        <YStack gap={8}>
          <Text fontSize={12} fontWeight="700" color="$color">
            {labels.pickVenue}
          </Text>
          <OptionChipRow
            layout="column"
            testIDPrefix="auto-pod-venue"
            options={venueOptions}
            value={accept.venueId}
            onSelect={accept.setVenueId}
          />
        </YStack>

        <YStack gap={8}>
          <Text fontSize={12} fontWeight="700" color="$color">
            {labels.pickSlot}
          </Text>
          <OptionChipRow
            layout="column"
            testIDPrefix="auto-pod-slot"
            options={slotOptions}
            value={accept.slotId}
            onSelect={accept.setSlotId}
          />
        </YStack>

        {accept.showNoSlots ? (
          <YStack gap={10}>
            <Text testID="auto-pod-no-slots" fontSize={12.5} color="$muted">
              {labels.noSlots}
            </Text>
            {onAddAvailability ? (
              <PillButton
                testID="auto-pod-add-availability"
                label={labels.addAvailability}
                onPress={onAddAvailability}
                variant="ghost"
                disabled={false}
              />
            ) : null}
          </YStack>
        ) : null}

        {accept.failure ? (
          <Text testID="auto-pod-accept-error" fontSize={12} color="$danger">
            {accept.failure}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
