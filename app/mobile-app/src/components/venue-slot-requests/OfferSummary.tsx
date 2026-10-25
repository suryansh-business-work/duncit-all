import { Text, YStack } from 'tamagui';
import { currentOfferTerms, offerGuestsText, venueOfferHistoryKey } from '@duncit/utils';

import { offerStepTerms } from '@/components/venue-offer/offer-format';
import { OfferTermsPanel } from '@/components/venue-offer/OfferTermsPanel';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { BookingOffer } from '@/hooks/useVenueSlotRequests';

/** Every step of the negotiation, oldest first — who moved, the terms, the fewest guests named, any note. */
function OfferHistory({ history }: Readonly<{ history: BookingOffer['history'] }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const steps = history.filter((entry) => venueOfferHistoryKey(entry));
  if (steps.length === 0) return null;

  return (
    <YStack gap={4} testID="offer-summary-history">
      <Text fontSize={12} fontWeight="700" color="$muted">
        {t('availability.offers.history.title')}
      </Text>
      {steps.map((entry, index) => (
        <YStack key={`${entry.by}-${entry.action}-${entry.at ?? index}`} gap={2}>
          <Text fontSize={12} color="$color">
            {t(venueOfferHistoryKey(entry), { vars: { terms: offerStepTerms(t, entry) } })}
            {entry.at ? ` · ${fmt.formatDateTime(entry.at)}` : ''}
          </Text>
          {entry.note ? (
            <Text fontSize={12} color="$muted">
              {t('availability.offers.history.note', { vars: { note: entry.note } })}
            </Text>
          ) : null}
        </YStack>
      ))}
    </YStack>
  );
}

/**
 * A host's offer on a booking request: for how many guests (from the venue's
 * minimum to the pod's spots), pets and the space, then the terms on the table
 * (the venue's counter while the host decides) — where it stands, what the
 * venue receives and what the host pays as a range, what the venue is asked to
 * provide, the note, until when to answer — and how it went. The RN twin of the
 * web OfferRequestCard's terms + OfferHistory (rule 27).
 */
export function OfferSummary({
  offer,
  podIsFree,
}: Readonly<{ offer: BookingOffer; podIsFree: boolean }>) {
  const { t } = useTranslation();
  const booking = [
    offerGuestsText(t, currentOfferTerms(offer).minGuests, offer.pax),
    offer.pets ? t('availability.offers.pets') : '',
    offer.space_label || t('availability.offers.wholeVenue'),
  ].filter(Boolean);

  return (
    <YStack gap={10} testID={`offer-summary-${offer.slot_id}`}>
      <Text fontSize={13} color="$muted">
        {booking.join(' · ')}
      </Text>
      <OfferTermsPanel offer={offer} podIsFree={podIsFree} side="VENUE" />
      <OfferHistory history={offer.history} />
    </YStack>
  );
}
