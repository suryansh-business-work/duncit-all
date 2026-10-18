import { Controller } from 'react-hook-form';
import { Alert, CircularProgress, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { POD_SERIES_FREQUENCIES, parseApiError } from '@duncit/utils';
import DateField from '../../../../components/DateField';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import type { CreatePodForm } from '../create-pod.types';
import SeriesDatesList from './SeriesDatesList';
import RepeatDiscountField from './RepeatDiscountField';
import { useSeriesPreview } from './useSeriesPreview';

/**
 * One time or Recurring, under the pod's first date (its slot, or its virtual
 * window). Recurring repeats that date daily, weekly or every two weeks until
 * an end day; the server lists every date and its slot, and the host can
 * untick any of them before publishing. It publishes as ONE pod with those
 * dates; members book the dates they want, with the multi-date discount set
 * here. Each date goes to the venue as its own slot request — grouped, so the
 * venue can answer all at once. Native twin: PodRepeatSection.
 */
export default function PodRepeatSection({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  const { control, watch, setValue, formState: { errors } } = form;
  const values = watch();
  const { loading, error, preview } = useSeriesPreview(values);
  const runnable = (preview?.dates ?? []).filter(
    (d) => d.available && !values.repeat_skip_dates.includes(d.start_at)
  );

  // A Pod Request's slot is one agreed date — it has nothing to repeat.
  if (values.partner_request_id) return null;

  const toggleDate = (startAt: string, include: boolean) => {
    const rest = values.repeat_skip_dates.filter((d) => d !== startAt);
    setValue('repeat_skip_dates', include ? rest : [...rest, startAt], { shouldDirty: true });
  };

  return (
    <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }} data-testid="pod-repeat-section">
      <Typography variant="subtitle2" component="h3">{t('mweb.podSeries.title')}</Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={values.repeat_enabled ? 'RECURRING' : 'ONE_TIME'}
        onChange={(_e, next: string | null) => {
          if (next) setValue('repeat_enabled', next === 'RECURRING', { shouldDirty: true });
        }}
        aria-label={t('mweb.podSeries.title')}
      >
        <ToggleButton value="ONE_TIME" data-testid="pod-repeat-one-time">{t('mweb.podSeries.oneTime')}</ToggleButton>
        <ToggleButton value="RECURRING" data-testid="pod-repeat-recurring">{t('mweb.podSeries.recurring')}</ToggleButton>
      </ToggleButtonGroup>
      {values.repeat_enabled && (
        <>
          <Controller
            control={control}
            name="repeat_frequency"
            render={({ field }) => (
              <TextField
                select
                fullWidth
                label={t('mweb.podSeries.frequencyLabel')}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                data-testid="pod-repeat-frequency"
              >
                {POD_SERIES_FREQUENCIES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{t(option.labelKey)}</MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            control={control}
            name="repeat_ends_on"
            render={({ field }) => (
              <DateField
                label={t('mweb.podSeries.endsOnLabel')}
                value={field.value}
                onChange={field.onChange}
                minDate={values.pod_date_time}
                required
                error={!!errors.repeat_ends_on}
                helperText={errors.repeat_ends_on?.message ?? t('mweb.podSeries.endsOnHint')}
              />
            )}
          />
          {loading && <CircularProgress size={20} aria-label={t('mweb.a11y.loading')} />}
          {error && <Alert severity="error" data-testid="pod-repeat-error">{parseApiError(error) || t('mweb.podSeries.previewFailed')}</Alert>}
          {preview && (
            <>
              <Typography variant="body2" data-testid="pod-repeat-count" sx={{ fontWeight: 600 }}>
                {t('mweb.podSeries.willCreate', { vars: { count: runnable.length, total: preview.dates.length } })}
              </Typography>
              {runnable.length < 2 && (
                <Alert severity="warning" data-testid="pod-repeat-too-few">{t('mweb.podSeries.needTwoDates')}</Alert>
              )}
              <SeriesDatesList dates={preview.dates} skipped={values.repeat_skip_dates} onToggle={toggleDate} />
              {values.pod_type !== 'FREE' && (
                <RepeatDiscountField
                  form={form}
                  defaults={preview.default_multi_date_discount_tiers}
                  maxDates={preview.max_occurrences}
                  maxPct={preview.max_discount_pct}
                />
              )}
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('mweb.podSeries.limitsHint', { vars: { max: preview.max_occurrences, days: preview.max_span_days } })}
              </Typography>
            </>
          )}
        </>
      )}
    </Stack>
  );
}
