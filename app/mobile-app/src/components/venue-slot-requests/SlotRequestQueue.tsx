import { Spinner, Text, XStack, YStack } from 'tamagui';

import { SelectChip } from '@/components/venue-availability/SelectChip';
import { OfferNoticeText } from '@/components/venue-offer/OfferNoticeText';
import { SlotRequestCard } from '@/components/venue-slot-requests/SlotRequestCard';
import { useVenueSlotRequests, ALL_VENUES } from '@/hooks/useVenueSlotRequests';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Called after any decision, so the answered history below re-reads too. */
  onDecided: () => void;
  /** Opens a request's venue chat with its host. */
  onChat?: (podId: string) => void;
}

/**
 * Booking requests waiting on the venue — hosts' offers to run a pod there —
 * on Workshop & Event Requests' first tab: accept, reject, or counter with the
 * venue's own terms (which the host then accepts, rejects or counters). A
 * request from before offers keeps accept / reject only. A pod goes live the
 * moment the venue says yes, so neither answer is a tap to make by accident:
 * each card opens its own sheet for it.
 */
export function SlotRequestQueue({ onDecided, onChat }: Readonly<Props>) {
  const { t } = useTranslation();
  const slots = useVenueSlotRequests(onDecided);
  const { answers } = slots;

  return (
    <YStack gap={16} testID="slot-request-queue">
      {slots.venues.length > 1 && (
        <XStack gap={8} flexWrap="wrap" role="radiogroup" aria-label={t('mweb.common.venue')}>
          <SelectChip
            testID="slot-requests-venue-all"
            role="radio"
            label={t('mweb.venueSlotRequests.allVenues')}
            selected={slots.venueId === ALL_VENUES}
            onPress={() => slots.setVenueId(ALL_VENUES)}
          />
          {slots.venues.map((venue) => (
            <SelectChip
              key={venue.id}
              testID={`slot-requests-venue-${venue.id}`}
              role="radio"
              label={venue.venue_name || t('mweb.venueManagePage.untitledVenue')}
              selected={slots.venueId === venue.id}
              onPress={() => slots.setVenueId(venue.id)}
            />
          ))}
        </XStack>
      )}

      <OfferNoticeText
        notice={answers.notice}
        onDismiss={answers.clearNotice}
        testID="slot-request-feedback"
      />

      {slots.isLoading && (
        <Spinner
          testID="slot-request-loading"
          role="progressbar"
          aria-label={t('mweb.a11y.loading')}
          color="$primary"
        />
      )}

      {!slots.isLoading && slots.requests.length === 0 && (
        <Text fontSize={14} color="$muted" textAlign="center">
          {t('mweb.venueSlotRequests.empty')}
        </Text>
      )}

      {slots.requests.map((request) => (
        <SlotRequestCard
          key={request.slot_id}
          request={request}
          answers={answers}
          onChat={onChat}
        />
      ))}
    </YStack>
  );
}
