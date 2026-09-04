import { Text, XStack, YStack } from 'tamagui';
import { autoPodCityLabel, type AutoPodLabels, type AutoPodRow } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useVenueAcceptAutoPod } from '@/hooks/useVenueAcceptAutoPod';

interface Props {
  row: AutoPodRow | null;
  /** The venue chosen at the top of the queue — the one this accept commits. */
  venue: AutoPodVenueOption | null;
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
 * no date would leave hosts and club admins nothing to enrol against. The
 * venue is the one chosen at the top of the queue; the slots are its free ones
 * in the next few days, nearest first, and the chosen one says what it pays
 * the venue after Duncit's deductions. The slot is booked the instant this
 * succeeds and stays booked until the pod exists.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `VenueAcceptDialog` (rule 27); the
 * slot picker is a chip column rather than an MUI select, which is the pattern
 * every other native sheet uses for a short single-select list.
 */
export function VenueAcceptSheet({
  row,
  venue,
  labels,
  onClose,
  onAccepted,
  formatWhen,
  formatMoney,
  onAddAvailability,
}: Readonly<Props>) {
  const { warning, success } = useThemeColors();
  const accept = useVenueAcceptAutoPod(
    row?.id ?? null,
    venue,
    row?.location?.location_id ?? null,
    labels,
    onAccepted,
  );

  const slotOptions = accept.slots.map((slot) => {
    const space = slot.space_label ? ` · ${slot.space_label}` : '';
    return [
      slot.id,
      `${formatWhen(slot.start_at)}${space} · ${formatMoney(slot.price)}`,
    ] as readonly [string, string];
  });

  let earningLine = null;
  if (accept.selected?.viable) {
    earningLine = (
      <Text testID="auto-pod-slot-earning" fontSize={12.5} fontWeight="700" color={success}>
        {labels.potentialEarning(formatMoney(accept.selected.venue_receives))}
      </Text>
    );
  } else if (accept.selected) {
    earningLine = (
      <Text testID="auto-pod-slot-not-viable" fontSize={12.5} color={warning}>
        {labels.slotNotViable}
      </Text>
    );
  }

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
          disabled={!accept.canAccept}
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

        {row?.location ? (
          <Text testID="auto-pod-accept-city" fontSize={12.5} color="$color">
            {labels.pinnedTo(autoPodCityLabel(row.location))}
          </Text>
        ) : null}

        {venue ? (
          <Text testID="auto-pod-accepting-with" fontSize={12.5} color="$color">
            {labels.acceptingWith(venue.venue_name)}
          </Text>
        ) : (
          <Text testID="auto-pod-pick-venue-first" fontSize={12.5} color="$muted">
            {labels.pickVenueFirst}
          </Text>
        )}

        {venue && !accept.venueInCity ? (
          <Text testID="auto-pod-no-venue-in-city" fontSize={12} color={warning}>
            {labels.noVenueInCity(autoPodCityLabel(row?.location))}
          </Text>
        ) : null}

        <YStack gap={8}>
          <Text fontSize={12} fontWeight="700" color="$color">
            {labels.pickSlot}
          </Text>
          {accept.windowDays > 0 ? (
            <Text testID="auto-pod-slot-window" fontSize={11.5} color="$muted">
              {labels.slotWindow(accept.windowDays)}
            </Text>
          ) : null}
          {/* Reading a venue's free slots is a round trip; without this the
              chip column just sits empty and reads as "no slots". */}
          {accept.slotsLoading ? <LoadingIndicator testID="auto-pod-slots-loading" /> : null}
          <OptionChipRow
            layout="column"
            testIDPrefix="auto-pod-slot"
            options={slotOptions}
            value={accept.slotId}
            onSelect={accept.setSlotId}
          />
          {earningLine}
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

        {accept.busy ? <LoadingIndicator testID="auto-pod-accept-busy" /> : null}

        {accept.failure ? (
          <Text testID="auto-pod-accept-error" fontSize={12} color="$danger">
            {accept.failure}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
