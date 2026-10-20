import { Controller, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { Alert, Checkbox, FormControlLabel, Grid, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { weekdayLabels } from '@duncit/slots';
import { SectionCard } from '@duncit/ui';
import { TimeField } from './fields';
import type { VenuePricingFormValues } from './venue-pricing.types';

interface Props {
  control: Control<VenuePricingFormValues>;
}

/**
 * Open dates & hours — when a per-guest, per-hour or flat venue can be booked.
 * Off = the venue's usual hours from its settings; on = the owner's own hours
 * per weekday, and an unticked day is closed.
 */
export default function HoursSection({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const days = weekdayLabels(t).full;
  const custom = useWatch({ control, name: 'custom_hours' });
  const { fields } = useFieldArray({ control, name: 'operating_hours' });
  const rows = useWatch({ control, name: 'operating_hours' });

  return (
    <SectionCard
      title={t('venuePricing.hours.title')}
      subtitle={t('venuePricing.hours.subtitle')}
      action={
        <Controller
          control={control}
          name="custom_hours"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  data-testid="pricing-custom-hours"
                />
              }
              label={t('venuePricing.hours.custom')}
            />
          )}
        />
      }
    >
      {custom ? (
        <Stack spacing={1}>
          <Controller
            control={control}
            name="operating_hours"
            render={({ fieldState }) => {
              // The day rows are mounted whenever this check can fail, so the
              // resolver files the error on the field array's `root`.
              const message = fieldState.error?.root?.message;
              return message ? <Alert severity="error">{message}</Alert> : <span />;
            }}
          />
          {fields.map((field, index) => (
            <Grid container spacing={1.5} key={field.id} sx={{ alignItems: 'flex-start' }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Controller
                  control={control}
                  name={`operating_hours.${index}.enabled`}
                  render={({ field: open }) => (
                    <FormControlLabel
                      control={<Checkbox checked={open.value} onChange={(e) => open.onChange(e.target.checked)} />}
                      label={days[field.day]}
                    />
                  )}
                />
              </Grid>
              {rows?.[index]?.enabled ? (
                <>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TimeField control={control} name={`operating_hours.${index}.open`} label={t('venuePricing.hours.opens')} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TimeField control={control} name={`operating_hours.${index}.close`} label={t('venuePricing.hours.closes')} />
                  </Grid>
                </>
              ) : (
                <Grid size={{ xs: 12, sm: 8 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', pt: 1 }}>
                    {t('venuePricing.hours.closedDay')}
                  </Typography>
                </Grid>
              )}
            </Grid>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('venuePricing.hours.usual')}
        </Typography>
      )}
    </SectionCard>
  );
}
