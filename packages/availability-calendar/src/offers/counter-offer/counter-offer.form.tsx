import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { makeVenueOfferCounterSchema } from '@duncit/forms/schemas';
import OfferQuoteView from '../OfferQuoteView';
import OfferTermsFields from '../OfferTermsFields';
import type { OfferSide } from '../offer-target';
import { useCounterQuote, type CounterQuoteSource } from '../useCounterQuote';
import { asksMinGuests, counterQuoteTermsOf, type CounterOfferValues } from './counter-offer.types';
import OfferImagesField from './OfferImagesField';

interface Props {
  formId: string;
  /** Who counters: the note is to the other side, and the price reads as that side reads it. */
  side: OfferSide;
  /** Prices the terms as they are typed (the venue's booking, or the host's pod). */
  quote: CounterQuoteSource;
  /** The booking's guests: a minimum may not pass them. */
  maxGuests: number;
  defaultValues: CounterOfferValues;
  onSubmit: (values: CounterOfferValues) => Promise<void>;
}

/**
 * Either side's counter: a pricing option and the amount, the fewest guests
 * paid for (a per-guest price only), what the venue provides, a note and photos
 * from the device — with the server's price of those terms as they are typed.
 * The points, the note and the photos never ask for a new price.
 */
export default function CounterOfferForm({ formId, side, quote, maxGuests, defaultValues, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueOfferCounterSchema(t, maxGuests), [t, maxGuests]);
  const { control, handleSubmit, watch, setValue } = useForm<CounterOfferValues>({ resolver: zodResolver(schema), defaultValues });
  const [model, rate, minGuests] = watch(['model', 'rate', 'min_guests']);
  const perGuest = asksMinGuests(model);
  const priced = useCounterQuote(quote, counterQuoteTermsOf({ model, rate, min_guests: minGuests }));

  // A hidden minimum is never sent, so it never blocks the counter either.
  useEffect(() => {
    if (!perGuest) setValue('min_guests', '');
  }, [perGuest, setValue]);

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <Grid container spacing={1.5}>
        <OfferTermsFields control={control} />
        {perGuest && (
          <Grid size={12}>
            <RhfTextField
              control={control}
              name="min_guests"
              type="number"
              label={t('availability.offers.minGuests')}
              hint={t('availability.offers.minGuestsHint', { vars: { max: maxGuests } })}
              slotProps={{ htmlInput: { min: 1, max: maxGuests, step: 1, inputMode: 'numeric' } }}
            />
          </Grid>
        )}
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="offerings"
            multiline
            minRows={3}
            label={t('availability.offers.offeringsLabel')}
            hint={t('availability.offers.offeringsHint')}
          />
        </Grid>
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="note"
            multiline
            minRows={2}
            label={side === 'HOST' ? t('availability.offers.hostAnswer.note') : t('availability.offers.note')}
          />
        </Grid>
        <Grid size={12}>
          <OfferImagesField control={control} />
        </Grid>
      </Grid>
      <Stack spacing={1} sx={{ mt: 1 }} data-testid="counter-offer-preview">
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {t('availability.offers.preview')}
        </Typography>
        {priced.loading && <LinearProgress aria-label={t('availability.offers.quoteLoading')} />}
        {priced.error && <Alert severity="error">{t('availability.offers.quoteFailed')}</Alert>}
        {priced.result && !priced.result.ok && <Alert severity="warning">{priced.result.message}</Alert>}
        {priced.result?.quote && <OfferQuoteView side={side} quote={priced.result.quote} quoteMin={priced.result.quote_min} />}
      </Stack>
    </form>
  );
}
