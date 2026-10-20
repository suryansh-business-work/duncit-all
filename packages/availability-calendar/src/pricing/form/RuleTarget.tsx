import { Controller, useWatch, type Control } from 'react-hook-form';
import { Chip, Grid, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { formatIsoDay } from '@duncit/datetime';
import DayOfWeekPicker from '../../recurring/DayOfWeekPicker';
import { IsoDateField } from './fields';
import type { VenuePricingFormValues } from './venue-pricing.types';

interface Props {
  control: Control<VenuePricingFormValues>;
  index: number;
}

/** WHEN a rule applies: weekdays, a list of dates, or a date range — by its type. */
export default function RuleTarget({ control, index }: Readonly<Props>) {
  const { t } = useTranslation();
  const { dateFormat } = useDateFormat();
  const type = useWatch({ control, name: `price_rules.${index}.type` });

  if (type === 'WEEKDAY_SURCHARGE') {
    return (
      <Controller
        control={control}
        name={`price_rules.${index}.days`}
        render={({ field, fieldState }) => (
          <DayOfWeekPicker
            value={field.value}
            onChange={field.onChange}
            label={t('venuePricing.rules.days')}
            error={fieldState.error?.message}
            testId={`pricing-rule-${index}-days`}
          />
        )}
      />
    );
  }

  if (type === 'DATE_OVERRIDE') {
    return (
      <Controller
        control={control}
        name={`price_rules.${index}.dates`}
        render={({ field, fieldState }) => (
          <Stack spacing={1}>
            <IsoDateField
              label={t('venuePricing.rules.addDate')}
              value=""
              error={fieldState.error?.message}
              onChange={(day) => {
                if (day && !field.value.includes(day)) field.onChange([...field.value, day].sort((a, b) => a.localeCompare(b)));
              }}
              testId={`pricing-rule-${index}-add-date`}
            />
            {field.value.length > 0 ? (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {field.value.map((day) => (
                  <Chip
                    key={day}
                    size="small"
                    label={formatIsoDay(day, dateFormat)}
                    onDelete={() => field.onChange(field.value.filter((d) => d !== day))}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('venuePricing.rules.noDates')}
              </Typography>
            )}
          </Stack>
        )}
      />
    );
  }

  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          control={control}
          name={`price_rules.${index}.from`}
          render={({ field }) => (
            // A range's one check ("from" after "to") is reported on "to".
            <IsoDateField label={t('venuePricing.rules.from')} value={field.value} onChange={field.onChange} />
          )}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Controller
          control={control}
          name={`price_rules.${index}.to`}
          render={({ field, fieldState }) => (
            <IsoDateField label={t('venuePricing.rules.to')} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
          )}
        />
      </Grid>
    </Grid>
  );
}
