import { Text, YStack } from 'tamagui';
import { isFreeVenueOfferModel } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodForm, CreatePodVenue } from '../create-pod.types';
import { FREE_JUSTIFICATION_NAMES, FreeArrangementFields } from '../free-arrangement';
import { OfferAskFields } from './VenueSlotStep/OfferAskFields';
import { OfferTermsFields } from './VenueSlotStep/OfferTermsFields';
import { VenueMinBusinessNote } from './VenueSlotStep/VenueMinBusinessNote';
import { VenueQuoteCard, type VenueQuoteState } from './VenueSlotStep/VenueQuoteCard';

interface Props {
  form: CreatePodForm;
  venues: readonly CreatePodVenue[];
  /** The server's quote for the offer (the stepper owns it). */
  quote: VenueQuoteState;
  currencySymbol: string;
}

/**
 * Step 4 — Offer for Venue, walked only by a pod that sends its venue an offer.
 * The venue's minimum business comes first: an offer below the amount on the
 * basis the host pays on does not leave this step (the schema) and is refused
 * by the server. Then how the host pays and how much, why a free venue is free,
 * what they need from the venue, and the server's quote at both ends of the
 * guests. The venue accepts, rejects or counters it once the pod is sent.
 * mWeb twin: VenueOfferStep.
 */
export function VenueOfferStep({ form, venues, quote, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const venueId = form.watch('venue_id');
  const venue = venues.find((entry) => entry.id === venueId) ?? null;
  // A free venue asks no amount: the host says why it is free instead.
  const freeVenue = isFreeVenueOfferModel(form.watch('venue_offer_model'));

  return (
    <YStack gap={16} testID="create-pod-offer-step">
      <VenueMinBusinessNote rows={venue?.offer_min_business} />
      <Text fontSize={14} fontWeight="700" color="$color">
        {t('mweb.createPod.offer.title')}
      </Text>
      <OfferTermsFields form={form} />
      {freeVenue ? (
        <FreeArrangementFields
          control={form.control}
          names={FREE_JUSTIFICATION_NAMES}
          testIDPrefix="create-pod-venue"
        />
      ) : null}
      <OfferAskFields
        control={form.control}
        offeringsName="venue_offer_offerings"
        noteName="venue_offer_note"
      />
      <VenueQuoteCard {...quote} currencySymbol={currencySymbol} free={freeVenue} />
    </YStack>
  );
}
