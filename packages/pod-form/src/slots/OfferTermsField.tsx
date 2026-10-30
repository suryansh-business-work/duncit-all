import { useQuery } from '@apollo/client/react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Alert, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { VenueOfferAskFields } from '@duncit/forms';
import {
  HOST_OFFER_MODELS,
  VENUE_OFFER_ASK_LIMITS,
  formatStatementMoney,
  isFreeVenueOfferModel,
  isHostOfferModel,
  venueMinBusinessLines,
  venueOfferInput,
  type VenueQuote,
} from '@duncit/utils';
import { useDebouncedValue } from '@duncit/ui';

import FreeJustificationField from '../components/FreeJustificationField';
import { usePodFormData } from '../context';
import { useTranslation } from '../i18n/useTranslation';
import type { PodFormValues } from '../types';
import OfferQuoteSummary from './OfferQuoteSummary';
import { PODFORM_OFFER_HELP_KEY, PODFORM_OFFER_MODEL_KEY, VENUE_OFFER_QUOTE } from './offerQueries';
import { useVenueOfferTerms } from './useVenueOfferTerms';

/** The amount is priced once typing stops, not once per keystroke. */
const QUOTE_DEBOUNCE_MS = 300;

interface QuoteAnswer {
  venueOfferQuote: { ok: boolean; message: string | null; quote: VenueQuote | null; quote_min?: VenueQuote | null };
}

/**
 * How the host offers to pay the venue — per guest, per hour, a flat price or
 * a free venue (no amount; why it is free and the free policy accepted instead,
 * and the venue accepts or declines it), with a line on how the picked option
 * pays — the amount, and what they need
 * from the venue (one point per line) with an optional note. What the venue
 * usually expects from a booking shows beside it as a guide. The
 * server prices the offer (the venue's charges and Duncit's commission on top)
 * at the pod's spots and at the venue's minimum guests, or says why it cannot
 * be sent; the points and the note never re-price it. The venue accepts,
 * rejects or counters once the pod is sent. mWeb / native twin:
 * OfferTermsFields.
 */
export default function OfferTermsField({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { finance } = usePodFormData();
  const { control, formState: { errors } } = useFormContext<PodFormValues>();
  const [start, end, model, rate, spots] = useWatch({
    control,
    name: ['pod_date_time', 'pod_end_date_time', 'venue_offer_model', 'venue_offer_rate', 'no_of_spots'],
  });
  const settledRate = useDebouncedValue(rate, QUOTE_DEBOUNCE_MS);
  const { minGuests, minBusiness } = useVenueOfferTerms(venueId);
  // The price only: the points and the note are left out, so typing them asks nothing.
  const offer = venueOfferInput({
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
    pax: Number(spots) || 0,
    pets: false,
    spaceLabel: '',
    model,
    rate: settledRate,
  });
  const { data } = useQuery<QuoteAnswer>(VENUE_OFFER_QUOTE, {
    variables: { venue_id: venueId, offer },
    skip: !venueId || !offer,
    fetchPolicy: 'cache-first',
  });
  const answer = offer ? data?.venueOfferQuote : undefined;
  const currency = finance?.currency_symbol ?? '';
  const modelHelp = isHostOfferModel(model) ? t(PODFORM_OFFER_HELP_KEY[model]) : t('podForm.offer.modelHint');
  const freeVenue = isFreeVenueOfferModel(model);
  const expects = venueMinBusinessLines(minBusiness, t, (value) => formatStatementMoney(value, currency));

  return (
    <Stack spacing={2} data-testid="pod-form-offer-terms">
      <Controller
        control={control}
        name="venue_offer_model"
        render={({ field }) => (
          <TextField
            select
            fullWidth
            required
            label={t('podForm.offer.modelLabel')}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            error={!!errors.venue_offer_model}
            helperText={errors.venue_offer_model?.message || modelHelp}
          >
            {HOST_OFFER_MODELS.map((option) => (
              <MenuItem key={option} value={option}>
                {t(PODFORM_OFFER_MODEL_KEY[option])}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      {/* A free venue is offered no amount: the host says why it is free instead. */}
      {freeVenue ? (
        <FreeJustificationField place="venue" />
      ) : (
        <Controller
          control={control}
          name="venue_offer_rate"
          render={({ field }) => (
            <TextField
              fullWidth
              required
              label={t('podForm.offer.rateLabel')}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              slotProps={{
                htmlInput: { inputMode: 'numeric' },
                input: { startAdornment: <InputAdornment position="start">{currency}</InputAdornment> },
              }}
              error={!!errors.venue_offer_rate}
              helperText={errors.venue_offer_rate?.message || t('podForm.offer.rateHint')}
            />
          )}
        />
      )}
      {minGuests > 0 && (
        <Typography variant="caption" data-testid="pod-form-venue-minimum" sx={{ color: 'text.secondary' }}>
          {t('availability.offers.ask.venueMinimum', { vars: { min: minGuests } })}
        </Typography>
      )}
      {expects.length > 0 && (
        <Typography variant="caption" data-testid="pod-form-venue-min-business" sx={{ color: 'text.secondary' }}>
          {`${t('availability.offers.minBusiness.createPodTitle')}: ${expects.join(' · ')} — ${t('availability.offers.minBusiness.createPodHint')}`}
        </Typography>
      )}
      <VenueOfferAskFields
        control={control}
        offeringsName="venue_offer_offerings"
        noteName="venue_offer_note"
        idPrefix="pod-form"
        required
        labels={{
          offerings: t('availability.offers.ask.offeringsLabel'),
          offeringsHint: t('availability.offers.ask.offeringsHint'),
          note: t('availability.offers.ask.noteLabel'),
          noteHint: t('availability.offers.ask.noteHint', { vars: { max: VENUE_OFFER_ASK_LIMITS.note } }),
        }}
      />
      {answer?.ok && answer.quote && (
        <OfferQuoteSummary quote={answer.quote} quoteMin={answer.quote_min ?? null} currency={currency} />
      )}
      {answer && !answer.ok && answer.message && <Alert severity="warning">{answer.message}</Alert>}
    </Stack>
  );
}
