import { Controller, useFieldArray, type Control } from 'react-hook-form';
import { Alert, Box, Grid, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import DayOfWeekPicker from '../../recurring/DayOfWeekPicker';
import { NumberField, TimeField } from './fields';
import { blankSlot, type VenuePricingFormValues } from './venue-pricing.types';

interface Props {
  control: Control<VenuePricingFormValues>;
}

/** A per-slot venue's bookable windows: each one a time, a price and the weekdays it repeats on. */
export default function SlotsSection({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'slots' });

  return (
    <SectionCard
      title={t('venuePricing.slots.title')}
      subtitle={t('venuePricing.slots.subtitle')}
      action={
        <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => append(blankSlot())} data-testid="pricing-slot-add">
          {t('venuePricing.slots.add')}
        </DuncitButton>
      }
    >
      <Controller
        control={control}
        name="slots"
        render={({ fieldState }) =>
          fieldState.error?.message ? (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {fieldState.error.message}
            </Alert>
          ) : (
            <Box />
          )
        }
      />
      {fields.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('venuePricing.slots.empty')}
        </Typography>
      )}
      <Stack spacing={2} divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
        {fields.map((field, index) => (
          <Box key={field.id} data-testid={`pricing-slot-${index}`}>
            <Grid container spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TimeField control={control} name={`slots.${index}.start_time`} label={t('venuePricing.slots.start')} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TimeField control={control} name={`slots.${index}.end_time`} label={t('venuePricing.slots.end')} />
              </Grid>
              <Grid size={{ xs: 9, sm: 5 }}>
                <NumberField control={control} name={`slots.${index}.price`} label={t('venuePricing.slots.price')} rupee />
              </Grid>
              <Grid size={{ xs: 3, sm: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <DuncitIconButton
                  aria-label={t('venuePricing.slots.remove', { vars: { n: index + 1 } })}
                  onClick={() => remove(index)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </DuncitIconButton>
              </Grid>
            </Grid>
            <Controller
              control={control}
              name={`slots.${index}.days_of_week`}
              render={({ field: days, fieldState }) => (
                <DayOfWeekPicker
                  value={days.value}
                  onChange={days.onChange}
                  label={t('venuePricing.slots.days')}
                  error={fieldState.error?.message}
                  testId={`pricing-slot-${index}-days`}
                />
              )}
            />
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}
