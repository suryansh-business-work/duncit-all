import { Controller, type Control } from 'react-hook-form';
import { Box, Grid, Slider, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from '../i18n/useTranslation';
import type { AdRequestFormValues } from '../ad-request.types';
import { dayLabel } from './dayLabel';

interface Props {
  control: Control<AdRequestFormValues, any, AdRequestFormValues>;
  /** Marketing's campaign-length window, already clamped by the form. */
  window: { min: number; max: number };
  durationMarks: { value: number; label: string }[];
}

/** When the campaign starts and how many days it runs. */
export default function AdScheduleFields({ control, window, durationMarks }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <Controller
          control={control}
          name="start_at"
          render={({ field, fieldState }) => (
            <DatePicker
              label={t('adRequest.form.startDate')}
              value={field.value ? new Date(field.value) : null}
              onChange={(date) => field.onChange(date ? date.toISOString() : '')}
              disablePast
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: !!fieldState.error,
                  helperText: fieldState.error?.message ?? t('adRequest.form.startDateHint'),
                }}}
            />
          )}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <Controller
          control={control}
          name="duration_days"
          render={({ field }) => (
            <Box sx={{ px: 1 }}>
              <Typography variant="body2" gutterBottom id="ad-duration-label" sx={{
                color: "text.secondary"
              }}>
                {t('adRequest.form.duration', {
                  vars: {
                    days: t('adRequest.days', { count: field.value }),
                    from: dayLabel(window.min, t),
                    to: dayLabel(window.max, t),
                  },
                })}
              </Typography>
              <Slider
                value={field.value}
                onChange={(_event, value) => field.onChange(value as number)}
                min={window.min}
                max={window.max}
                step={1}
                marks={durationMarks}
                valueLabelDisplay="auto"
                aria-labelledby="ad-duration-label"
              />
            </Box>
          )}
        />
      </Grid>
    </>
  );
}
