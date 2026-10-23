import { useMemo } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Grid, LinearProgress, MenuItem, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { isIsoDay } from '@duncit/datetime';
import { RhfTextField, TIME_OF_DAY_PATTERN } from '@duncit/forms';
import { isVenueOfferModel } from '@duncit/utils';
import { offerTerms } from '../../event-requests/respond-form/respond-event-request.types';
import { errorText } from '../../pricing/format';
import { IsoDateField, NumberField, TimeField } from '../../pricing/form/fields';
import PriceBreakdownView from '../../pricing/preview/PriceBreakdownView';
import OfferTermsFields from '../OfferTermsFields';
import type { Translate } from '../../pricing/types';
import { useWindowQuote, type WindowQuoteSource } from './useWindowQuote';
import { windowOfferInput, type WindowOfferInput, type WindowOfferValues } from './window-offer.types';

/** A day, an end after the start, whole guests when asked for, a pricing option and an amount above 0. */
export const buildWindowOfferSchema = (t: Translate, askPax: boolean) =>
  z
    .object({
      date: z.string(),
      start: z.string(),
      end: z.string(),
      space: z.string(),
      pax: z.union([z.number(), z.nan()]),
      model: z.string(),
      rate: z.string(),
    })
    .superRefine((v, ctx) => {
      if (!isIsoDay(v.date)) ctx.addIssue({ code: 'custom', message: t('venuePricing.validation.pickDate'), path: ['date'] });
      if (!TIME_OF_DAY_PATTERN.test(v.start)) ctx.addIssue({ code: 'custom', message: t('venuePricing.validation.time'), path: ['start'] });
      if (!TIME_OF_DAY_PATTERN.test(v.end) || v.end <= v.start) {
        ctx.addIssue({ code: 'custom', message: t('venuePricing.validation.endAfterStart'), path: ['end'] });
      }
      if (askPax && (!Number.isInteger(v.pax) || v.pax < 1)) {
        ctx.addIssue({ code: 'custom', message: t('venuePricing.validation.wholeNumber'), path: ['pax'] });
      }
      if (!isVenueOfferModel(v.model)) ctx.addIssue({ code: 'custom', message: t('availability.offers.validation.model'), path: ['model'] });
      else if (!offerTerms(v)) ctx.addIssue({ code: 'custom', message: t('availability.offers.validation.rate'), path: ['rate'] });
    });

interface Props {
  formId: string;
  defaultValues: WindowOfferValues;
  /** The venue's spaces ('' = whole venue); a choice appears only when there are several. */
  spaces?: readonly string[];
  /** Ask for the guests (a Pod Request); false when they are fixed (an Auto Pod's or a pod's spots). */
  askPax?: boolean;
  quote: WindowQuoteSource;
  onSubmit: (offer: WindowOfferInput) => Promise<void>;
}

/**
 * Propose a booking: the day, a start and an end, the space, the guests and how
 * the venue is paid — with the server's price for it (the venue's charges, and
 * Duncit's commission on top) or why it cannot be booked. One form for Pod
 * Requests, Auto Pod acceptance and Change Requests; the caller owns the button.
 */
export default function WindowOfferForm({ formId, defaultValues, spaces = [], askPax = false, quote, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildWindowOfferSchema(t, askPax), [t, askPax]);
  const { control, handleSubmit, watch } = useForm<WindowOfferValues>({ resolver: zodResolver(schema), defaultValues });
  const values = watch();
  const valid = schema.safeParse(values).success;
  const priced = useWindowQuote(quote, valid ? windowOfferInput(values) : null);

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit(async (next) => {
        const offer = windowOfferInput(next);
        if (offer) await onSubmit(offer);
      })}
    >
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: askPax ? 6 : 12 }}>
          <Controller
            control={control}
            name="date"
            render={({ field, fieldState }) => (
              <IsoDateField
                label={t('venuePricing.respond.date')}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                minDate={new Date()}
              />
            )}
          />
        </Grid>
        {askPax && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <NumberField control={control} name="pax" label={t('venuePricing.respond.pax')} step={1} />
          </Grid>
        )}
        <Grid size={6}>
          <TimeField control={control} name="start" label={t('venuePricing.respond.start')} />
        </Grid>
        <Grid size={6}>
          <TimeField control={control} name="end" label={t('venuePricing.respond.end')} />
        </Grid>
        {spaces.length > 1 && (
          <Grid size={12}>
            <RhfTextField control={control} name="space" select label={t('availability.offers.space')}>
              {spaces.map((space) => (
                <MenuItem key={space} value={space}>
                  {space || t('availability.offers.wholeVenue')}
                </MenuItem>
              ))}
            </RhfTextField>
          </Grid>
        )}
        <OfferTermsFields control={control} />
      </Grid>
      <Stack spacing={1} sx={{ mt: 1.5 }} data-testid="window-offer-quote">
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 900 }}>
          {t('availability.offers.preview')}
        </Typography>
        {valid && priced.loading && <LinearProgress aria-label={t('availability.offers.quoteLoading')} />}
        {priced.error && <Alert severity="warning">{errorText(priced.error, t('availability.offers.quoteFailed'))}</Alert>}
        {priced.answer && !priced.answer.ok && <Alert severity="warning">{priced.answer.message}</Alert>}
        {valid && !priced.error && priced.answer?.quote && <PriceBreakdownView breakdown={priced.answer.quote} />}
      </Stack>
    </form>
  );
}
