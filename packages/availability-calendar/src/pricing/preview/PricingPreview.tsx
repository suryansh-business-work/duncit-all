import { useState } from 'react';
import { Alert, Checkbox, FormControlLabel, Grid, LinearProgress, TextField, Typography } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useTranslation } from '@duncit/app-settings';
import { dateToTimeOfDay, timeOfDayToDate } from '@duncit/datetime';
import { SectionCard } from '@duncit/ui';
import { errorText } from '../format';
import { IsoDateField } from '../form/fields';
import { toPricingInput, type VenuePricingFormValues } from '../form/venue-pricing.types';
import type { SampleBooking } from '../types';
import PriceBreakdownView from './PriceBreakdownView';
import SampleSlotPicker from './SampleSlotPicker';
import { defaultSample, usePriceQuote } from './usePriceQuote';

interface Props {
  venueId: string;
  values: VenuePricingFormValues;
  valid: boolean;
}

/**
 * The live preview: a sample booking the owner can change, priced by the
 * server with the UNSAVED form as `draft` — exactly what a host would be
 * quoted, what the venue receives, and Duncit's fee on top.
 */
export default function PricingPreview({ venueId, values, valid }: Readonly<Props>) {
  const { t } = useTranslation();
  const [sample, setSample] = useState<SampleBooking>(defaultSample);
  const patch = (next: Partial<SampleBooking>) => setSample((prev) => ({ ...prev, ...next }));
  const quote = usePriceQuote({ venueId, sample, draft: valid ? toPricingInput(values) : null, enabled: valid });

  return (
    <SectionCard title={t('venuePricing.preview.title')} subtitle={t('venuePricing.preview.subtitle')}>
      <Grid container spacing={1.5} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <IsoDateField label={t('venuePricing.preview.date')} value={sample.date} onChange={(date) => patch({ date })} testId="pricing-preview-date" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <PaxInput label={t('venuePricing.preview.pax')} value={sample.pax} onChange={(pax) => patch({ pax })} />
        </Grid>
        {values.model === 'PER_SLOT' ? (
          <Grid size={12}>
            <SampleSlotPicker slots={values.slots} sample={sample} onPick={(start, end) => patch({ start, end })} />
          </Grid>
        ) : (
          <>
            <Grid size={6}>
              <ClockInput label={t('venuePricing.preview.start')} value={sample.start} onChange={(start) => patch({ start })} />
            </Grid>
            <Grid size={6}>
              <ClockInput label={t('venuePricing.preview.end')} value={sample.end} onChange={(end) => patch({ end })} />
            </Grid>
          </>
        )}
        <Grid size={12}>
          <FormControlLabel
            control={<Checkbox checked={sample.pets} onChange={(e) => patch({ pets: e.target.checked })} />}
            label={t('venuePricing.preview.pets')}
          />
        </Grid>
      </Grid>
      {quote.loading && <LinearProgress aria-label={t('venuePricing.preview.pricing')} sx={{ mb: 1 }} />}
      {!valid && <Alert severity="info">{t('venuePricing.preview.fixForm')}</Alert>}
      {valid && quote.incomplete && <Alert severity="info">{t('venuePricing.preview.pickWindow')}</Alert>}
      {valid && quote.error && (
        <Alert severity="warning" data-testid="pricing-preview-error">
          {errorText(quote.error, t('venuePricing.preview.failed'))}
        </Alert>
      )}
      {valid && !quote.error && quote.breakdown && <PriceBreakdownView breakdown={quote.breakdown} />}
      <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 1.5 }}>
        {t('venuePricing.preview.feeNote')}
      </Typography>
    </SectionCard>
  );
}

function ClockInput({ label, value, onChange }: Readonly<{ label: string; value: string; onChange: (v: string) => void }>) {
  return (
    <TimePicker
      label={label}
      value={timeOfDayToDate(value, '00:00')}
      onChange={(next) => onChange(dateToTimeOfDay(next, value))}
      slotProps={{ textField: { size: 'small', fullWidth: true } }}
    />
  );
}

function PaxInput({ label, value, onChange }: Readonly<{ label: string; value: number; onChange: (n: number) => void }>) {
  return (
    <TextField
      type="number"
      size="small"
      fullWidth
      label={label}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
      slotProps={{ htmlInput: { min: 0, step: 1 } }}
    />
  );
}
