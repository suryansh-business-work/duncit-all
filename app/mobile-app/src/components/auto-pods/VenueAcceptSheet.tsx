import { Text, YStack } from 'tamagui';
import { autoPodCityLabel, type AutoPodLabels, type AutoPodRow } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { WindowOfferForm } from '@/forms/window-offer';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueAcceptAutoPod } from '@/hooks/useVenueAcceptAutoPod';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  row: AutoPodRow | null;
  /** The venue chosen at the top of the queue — the one this accept commits. */
  venue: AutoPodVenueOption | null;
  labels: AutoPodLabels;
  onClose: () => void;
  onAccepted: () => void;
}

/**
 * Accepting an Auto Pod and fixing its time are ONE step: an acceptance with
 * no date would leave hosts and club admins nothing to enrol against. The
 * venue (chosen at the top of the queue) picks a window it is open and free
 * for and the price it charges; the server prices it with Duncit's commission
 * on top, and the window is booked at that price the instant this succeeds.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `VenueAcceptDialog` (rule 27).
 */
export function VenueAcceptSheet({ row, venue, labels, onClose, onAccepted }: Readonly<Props>) {
  const { t } = useTranslation();
  const { warning } = useThemeColors();
  const accept = useVenueAcceptAutoPod(
    row?.id ?? null,
    venue,
    row?.location?.location_id ?? null,
    labels,
    onAccepted,
  );

  if (row && venue && accept.venueInCity) {
    return (
      <WindowOfferForm
        testID="auto-pod-accept-sheet"
        venueId={venue.id}
        title={labels.confirmAccept}
        subtitle={[
          row.pod_title,
          labels.acceptingWith(venue.venue_name),
          t('windowOffer.autoPodHint'),
        ].join(' · ')}
        submitLabel={labels.acceptCta}
        busy={accept.busy}
        error={accept.failure || undefined}
        priceOf={accept.priceOf}
        onClose={onClose}
        onSubmit={(offer) => fireAndForget(accept.accept(offer))}
      />
    );
  }

  return (
    <DuncitDialog
      open={!!row}
      onClose={onClose}
      testID="auto-pod-accept-sheet"
      title={labels.confirmAccept}
      subtitle={labels.confirmAcceptBody}
      closeLabel={labels.dismiss}
    >
      <YStack gap={14}>
        {row ? (
          <Text fontSize={15} fontWeight="600" color="$color">
            {row.pod_title}
          </Text>
        ) : null}
        {row?.location ? (
          <Text testID="auto-pod-accept-city" fontSize={13} color="$color">
            {labels.pinnedTo(autoPodCityLabel(row.location))}
          </Text>
        ) : null}
        {venue ? (
          <Text testID="auto-pod-no-venue-in-city" fontSize={13} color={warning}>
            {labels.noVenueInCity(autoPodCityLabel(row?.location))}
          </Text>
        ) : (
          <Text testID="auto-pod-pick-venue-first" fontSize={13} color="$muted">
            {labels.pickVenueFirst}
          </Text>
        )}
      </YStack>
    </DuncitDialog>
  );
}
