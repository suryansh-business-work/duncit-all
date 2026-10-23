import { useMemo } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Grid, LinearProgress, MenuItem, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { isIsoDay } from '@duncit/datetime';
import { RhfTextField, TIME_OF_DAY_PATTERN } from '@duncit/forms';
import { VENUE_OFFER_COUNTER_MODELS } from '@duncit/forms/schemas';
import { VENUE_OFFER_INBOX_MODEL_KEY, isVenueOfferModel } from '@duncit/utils';
import { errorText } from '../../pricing/format';
import { IsoDateField, NumberField, TimeField } from '../../pricing/form/fields';
import PriceBreakdownView from '../../pricing/preview/PriceBreakdownView';
import type { Translate } from '../../pricing/types';
import { offerInput, offerTerms, type RespondChoice, type RespondEventRequestValues } from './respond-event-request.types';
import { useRespondQuote } from './useRespondQuote';

/** The server keeps a request note to 280 characters. */
const NOTE_MAX = 280;

/** Accept / reject need only an optional note; a counter offer also needs a valid window and price terms. */
export const buildRespondSchema = (t: Translate, choice: RespondChoice) => {
  const base = z.object({
    note: z.string().trim().max(NOTE_MAX, t('venuePricing.respond.noteTooLong')),
    date: z.string(),
    start: z.string(),
    end: z.string(),
    // NaN while the guests field is emptied — only a counter offer needs it (checked below).
    pax: z.union([z.number(), z.nan()]),
    model: z.string(),
    rate: z.string(),
  });
  if (choice !== 'COUNTER') return base;
  return base.superRefine((v, ctx) => {
    if (!isIsoDay(v.date)) ctx.addIssue({ code: 'custom', message: t('venuePricing.validation.pickDate'), path: ['date'] });
    if (!TIME_OF_DAY_PATTERN.test(v.start)) ctx.addIssue({ code: 'custom', message: t('venuePricing.validation.time'), path: ['start'] });
    if (!TIME_OF_DAY_PATTERN.test(v.end) || v.end <= v.start) {
      ctx.addIssue({ code: 'custom', message: t('venuePricing.validation.endAfterStart'), path: ['end'] });
    }
    if (!Number.isInteger(v.pax) || v.pax < 0) ctx.addIssue({ code: 'custom', message: t('venuePricing.validation.wholeNumber'), path: ['pax'] });
    if (!isVenueOfferModel(v.model)) ctx.addIssue({ code: 'custom', message: t('availability.offers.validation.model'), path: ['model'] });
    else if (!offerTerms(v)) ctx.addIssue({ code: 'custom', message: t('availability.offers.validation.rate'), path: ['rate'] });
  });
};

interface Props {
  formId: string;
  choice: RespondChoice;
  /** The venue the request is for — its pricing module prices a counter offer. Null for a host request. */
  venueId: string | null;
  defaultValues: RespondEventRequestValues;
  onSubmit: (values: RespondEventRequestValues) => Promise<void>;
}

/** The respond dialog's form: a note, and for a counter offer the date, time, guests and price terms with the server's quote. */
export default function RespondEventRequestForm({ formId, choice, venueId, defaultValues, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildRespondSchema(t, choice), [t, choice]);
  const { control, handleSubmit, watch } = useForm<RespondEventRequestValues>({ resolver: zodResolver(schema), defaultValues });
  const values = watch();
  const counter = choice === 'COUNTER';
  const valid = schema.safeParse(values).success;
  const quote = useRespondQuote(venueId, counter && valid ? offerInput(values) : null);

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(async (next) => onSubmit(next))}>
      <Grid container spacing={1.5}>
        {counter && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
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
            <Grid size={{ xs: 12, sm: 6 }}>
              <NumberField control={control} name="pax" label={t('venuePricing.respond.pax')} step={1} />
            </Grid>
            <Grid size={6}>
              <TimeField control={control} name="start" label={t('venuePricing.respond.start')} />
            </Grid>
            <Grid size={6}>
              <TimeField control={control} name="end" label={t('venuePricing.respond.end')} />
            </Grid>
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
          </>
        )}
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="note"
            multiline
            minRows={2}
            label={t('venuePricing.respond.note')}
            hint={t('venuePricing.respond.noteHint')}
          />
        </Grid>
      </Grid>
      {counter && venueId && (
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 900 }}>
            {t('venuePricing.respond.quoteTitle')}
          </Typography>
          {quote.loading && valid && <LinearProgress aria-label={t('venuePricing.preview.pricing')} />}
          {quote.error && <Alert severity="warning">{errorText(quote.error, t('venuePricing.preview.failed'))}</Alert>}
          {quote.answer && !quote.answer.ok && <Alert severity="warning">{quote.answer.message}</Alert>}
          {!quote.error && quote.answer?.quote && valid && <PriceBreakdownView breakdown={quote.answer.quote} />}
        </Stack>
      )}
    </form>
  );
}
