import { useQuery } from '@apollo/client/react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Alert, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  VENUE_OFFER_MODELS,
  formatStatementMoney,
  venueOfferInput,
  type VenueQuote,
} from '@duncit/utils';

import { usePodFormData } from '../context';
import { useTranslation } from '../i18n/useTranslation';
import type { PodFormValues } from '../types';
import { PODFORM_OFFER_MODEL_KEY, VENUE_OFFER_QUOTE } from './offerQueries';

interface QuoteAnswer {
  venueOfferQuote: { ok: boolean; message: string | null; quote: VenueQuote | null };
}

/**
 * How the host offers to pay the venue — per guest, per hour, for the slot or a
 * flat price — and the amount, with the server's price for it (the venue's
 * charges and Duncit's commission on top), or why it cannot be sent. The venue
 * accepts, rejects or counters once the pod is sent. mWeb / native twin:
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
  const offer = venueOfferInput({
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
    pax: Number(spots) || 0,
    pets: false,
    spaceLabel: '',
    model,
    rate,
  });
  const { data } = useQuery<QuoteAnswer>(VENUE_OFFER_QUOTE, {
    variables: { venue_id: venueId, offer },
    skip: !venueId || !offer,
    fetchPolicy: 'cache-first',
  });
  const answer = offer ? data?.venueOfferQuote : undefined;
  const currency = finance?.currency_symbol ?? '';

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
            helperText={errors.venue_offer_model?.message || t('podForm.offer.modelHint')}
          >
            {VENUE_OFFER_MODELS.map((option) => (
              <MenuItem key={option} value={option}>
                {t(PODFORM_OFFER_MODEL_KEY[option])}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
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
      {answer?.ok && answer.quote && (
        <Typography variant="body2" data-testid="pod-form-offer-total" sx={{ fontWeight: 700 }}>
          {t('podForm.offer.total', { vars: { amount: formatStatementMoney(answer.quote.total, currency) } })}
        </Typography>
      )}
      {answer && !answer.ok && answer.message && <Alert severity="warning">{answer.message}</Alert>}
    </Stack>
  );
}
