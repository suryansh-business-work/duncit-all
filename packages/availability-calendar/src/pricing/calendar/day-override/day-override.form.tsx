import { useMemo } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid, MenuItem, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { ruleModeLabel } from '../../format';
import { NumberField } from '../../form/fields';
import { PRICE_RULE_MODES, type Translate } from '../../types';
import type { DayOverrideValues } from './day-override.types';

/** One date's price change: a non-zero percent (-100…1000) or rupee amount. */
export const buildDayOverrideSchema = (t: Translate) =>
  z
    .object({
      mode: z.enum(PRICE_RULE_MODES),
      value: z
        .number({ error: t('venuePricing.validation.number') })
        .refine((v) => v !== 0, t('venuePricing.validation.nonZero')),
      label: z.string().trim().max(80, t('venuePricing.validation.labelTooLong')),
    })
    .refine((v) => v.mode !== 'PERCENT' || (v.value >= -100 && v.value <= 1000), {
      message: t('venuePricing.validation.percentRange'),
      path: ['value'],
    });

interface Props {
  defaultValues: DayOverrideValues;
  /** True when this date already has an override — offers Clear. */
  hasOverride: boolean;
  busy: boolean;
  onSave: (values: DayOverrideValues) => Promise<void>;
  onClear: () => Promise<void>;
}

/** Sets or clears the price change for one date (a DATE_OVERRIDE rule on that day only). */
export default function DayOverrideForm({ defaultValues, hasOverride, busy, onSave, onClear }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildDayOverrideSchema(t), [t]);
  const { control, handleSubmit } = useForm<DayOverrideValues>({ resolver: zodResolver(schema), defaultValues });

  return (
    <form
      noValidate
      aria-label={t('venuePricing.day.overrideTitle')}
      onSubmit={handleSubmit(async (values) => {
        await onSave({ ...values, label: values.label.trim() });
      })}
    >
      <Grid container spacing={1.5}>
        <Grid size={6}>
          <Controller
            control={control}
            name="mode"
            render={({ field }) => (
              <TextField {...field} select size="small" fullWidth label={t('venuePricing.rules.mode')}>
                {PRICE_RULE_MODES.map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {ruleModeLabel(t, mode)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>
        <Grid size={6}>
          <NumberField control={control} name="value" label={t('venuePricing.rules.value')} testId="day-override-value" />
        </Grid>
        <Grid size={12}>
          <RhfTextField control={control} name="label" size="small" label={t('venuePricing.rules.label')} />
        </Grid>
        <Grid size={12}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            {hasOverride && (
              <DuncitButton color="inherit" disabled={busy} onClick={onClear} data-testid="day-override-clear">
                {t('venuePricing.day.clearOverride')}
              </DuncitButton>
            )}
            <DuncitButton type="submit" variant="contained" loading={busy} data-testid="day-override-save">
              {t('venuePricing.day.saveOverride')}
            </DuncitButton>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
