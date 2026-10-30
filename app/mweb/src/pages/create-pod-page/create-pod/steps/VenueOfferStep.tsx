import { Stack, Typography } from '@mui/material';
import { FreeArrangementFields, VenueOfferAskFields } from '@duncit/forms';
import { VenueMinBusinessNote } from '@duncit/availability-calendar';
import { VENUE_OFFER_ASK_LIMITS, formatStatementMoney, isFreeVenueOfferModel } from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import { FREE_JUSTIFICATION_NAMES, type CreatePodForm, type CreatePodVenue } from '../create-pod.types';
import { useOfferQuote } from '../useOfferQuote';
import OfferTermsFields from './OfferTermsFields';
import VenueQuoteCard from './VenueQuoteCard';

interface Props {
  form: CreatePodForm;
  venues: readonly CreatePodVenue[];
}

/**
 * Step 4 — Offer for Venue, walked only by a pod that sends its venue an offer.
 * The venue's minimum business comes first: an offer below the amount on the
 * basis the host pays on does not leave this step (the schema) and is refused
 * by the server. Then how the host pays and how much, why a free venue is free,
 * what they need from the venue, and the server's quote at both ends of the
 * guests. The venue accepts, rejects or counters it once the pod is sent.
 * Native twin: VenueOfferStep.
 */
export default function VenueOfferStep({ form, venues }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const quote = useOfferQuote(form);
  const venueId = form.watch('venue_id');
  const venue = venues.find((entry) => entry.id === venueId) ?? null;
  const freeVenue = isFreeVenueOfferModel(form.watch('venue_offer_model'));

  return (
    <Stack spacing={2} data-testid="create-pod-offer-step">
      <VenueMinBusinessNote
        rows={venue?.offer_min_business}
        money={(value) => formatStatementMoney(value, currency)}
        testId="create-pod-venue-min-business"
      />
      <Typography variant="subtitle2" component="h3">{t('mweb.createPod.offer.title')}</Typography>
      <OfferTermsFields form={form} />
      {freeVenue && (
        <FreeArrangementFields control={form.control} names={FREE_JUSTIFICATION_NAMES} t={t} idPrefix="create-pod-venue" />
      )}
      <VenueOfferAskFields
        control={form.control}
        offeringsName="venue_offer_offerings"
        noteName="venue_offer_note"
        idPrefix="create-pod"
        labels={{
          offerings: requiredLabel(t('availability.offers.ask.offeringsLabel'), true),
          offeringsHint: t('availability.offers.ask.offeringsHint'),
          note: t('availability.offers.ask.noteLabel'),
          noteHint: t('availability.offers.ask.noteHint', { vars: { max: VENUE_OFFER_ASK_LIMITS.note } }),
        }}
      />
      <VenueQuoteCard
        quote={quote.quote}
        quoteMin={quote.quoteMin}
        message={quote.message}
        loading={quote.loading}
        error={quote.error}
        free={freeVenue}
      />
    </Stack>
  );
}
