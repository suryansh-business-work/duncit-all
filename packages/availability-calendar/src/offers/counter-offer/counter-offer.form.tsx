import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Grid, LinearProgress, MenuItem, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { makeVenueOfferCounterSchema, VENUE_OFFER_COUNTER_MODELS } from '@duncit/forms/schemas';
import { VENUE_OFFER_INBOX_MODEL_KEY } from '@duncit/utils';
import PriceBreakdownView from '../../pricing/preview/PriceBreakdownView';
import { useCounterQuote } from '../useCounterQuote';
import { counterTermsOf, type CounterOfferValues } from './counter-offer.types';

interface Props {
  formId: string;
  slotId: string;
  defaultValues: CounterOfferValues;
  onSubmit: (values: CounterOfferValues) => Promise<void>;
}

/** The venue's counter: a pricing option, the amount and a note, with the server's price of those terms as they are typed. */
export default function CounterOfferForm({ formId, slotId, defaultValues, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueOfferCounterSchema(t), [t]);
  const { control, handleSubmit, watch } = useForm<CounterOfferValues>({ resolver: zodResolver(schema), defaultValues });
  const model = watch('model');
  const rate = watch('rate');
  const terms = counterTermsOf({ model, rate });
  const quote = useCounterQuote(slotId, terms);

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfTextField control={control} name="model" select label={t('availability.offers.pricingOption')}>
            {VENUE_OFFER_COUNTER_MODELS.map((option) => (
              <MenuItem key={option} value={option}>
                {t(VENUE_OFFER_INBOX_MODEL_KEY[option].label)}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <RhfTextField
            control={control}
            name="rate"
            type="number"
            label={t('availability.offers.amount')}
            slotProps={{ htmlInput: { min: 0, step: 'any', inputMode: 'decimal' } }}
          />
        </Grid>
        <Grid size={12}>
          <RhfTextField control={control} name="note" multiline minRows={2} label={t('availability.offers.note')} />
        </Grid>
      </Grid>
      <Stack spacing={1} sx={{ mt: 1 }} data-testid="counter-offer-preview">
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('availability.offers.preview')}
        </Typography>
        {quote.loading && <LinearProgress aria-label={t('availability.offers.quoteLoading')} />}
        {quote.error && <Alert severity="error">{t('availability.offers.quoteFailed')}</Alert>}
        {quote.result && !quote.result.ok && <Alert severity="warning">{quote.result.message}</Alert>}
        {quote.result?.quote && <PriceBreakdownView breakdown={quote.result.quote} />}
      </Stack>
    </form>
  );
}
