import { Controller, useWatch, type Control } from 'react-hook-form';
import { FormControlLabel, Grid, MenuItem, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import { modelHint, modelLabel } from '../format';
import { PRICING_MODELS } from '../types';
import { NumberField } from './fields';
import type { VenuePricingFormValues } from './venue-pricing.types';

/** Booking steps a per-hour venue can sell in (the server wants multiples of 15). */
const STEPS = [15, 30, 60, 120];

interface Props {
  control: Control<VenuePricingFormValues>;
}

/** How the venue charges, its rate, and the limits that model reads. */
export default function ModelSection({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const model = useWatch({ control, name: 'model' });
  const rateLabel = model === 'PER_PAX' ? t('venuePricing.form.ratePerGuest') : t('venuePricing.form.rate');

  return (
    <SectionCard title={t('venuePricing.form.modelTitle')} subtitle={t('venuePricing.form.modelSubtitle')}>
      <Controller
        control={control}
        name="model"
        render={({ field }) => (
          <RadioGroup {...field} aria-label={t('venuePricing.form.modelTitle')} sx={{ mb: 2 }}>
            {PRICING_MODELS.map((m) => (
              <FormControlLabel
                key={m}
                value={m}
                control={<Radio size="small" slotProps={{ input: { 'aria-describedby': `pricing-model-${m}-hint` } }} />}
                data-testid={`pricing-model-${m}`}
                label={
                  <Stack>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {modelLabel(t, m)}
                    </Typography>
                    <Typography id={`pricing-model-${m}-hint`} variant="caption" sx={{ color: 'text.secondary' }}>
                      {modelHint(t, m)}
                    </Typography>
                  </Stack>
                }
              />
            ))}
          </RadioGroup>
        )}
      />
      <Grid container spacing={2}>
        {model === 'PER_SLOT' ? null : (
          <Grid size={{ xs: 12, sm: 6 }}>
            <NumberField control={control} name="base_rate" label={rateLabel} rupee testId="pricing-base-rate" />
          </Grid>
        )}
        <Grid size={{ xs: 6, sm: 3 }}>
          <NumberField control={control} name="min_pax" label={t('venuePricing.form.minPax')} step={1} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <NumberField
            control={control}
            name="max_pax"
            label={t('venuePricing.form.maxPax')}
            hint={t('venuePricing.form.noLimitHint')}
            step={1}
          />
        </Grid>
        {model === 'PER_HOUR' ? (
          <>
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberField control={control} name="min_hours" label={t('venuePricing.form.minHours')} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <NumberField
                control={control}
                name="max_hours"
                label={t('venuePricing.form.maxHours')}
                hint={t('venuePricing.form.noLimitHint')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                control={control}
                name="booking_increment_minutes"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    size="small"
                    fullWidth
                    label={t('venuePricing.form.step')}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? t('venuePricing.form.stepHint')}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {STEPS.map((minutes) => (
                      <MenuItem key={minutes} value={minutes}>
                        {t('venuePricing.form.stepMinutes', { vars: { minutes } })}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
          </>
        ) : null}
      </Grid>
    </SectionCard>
  );
}
