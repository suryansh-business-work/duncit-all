import { Controller } from 'react-hook-form';
import { addDays } from 'date-fns';
import { Alert, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { POD_SERIES_FREQUENCIES, parseApiError } from '@duncit/utils';
import DateField from '../../../../components/DateField';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import type { CreatePodForm } from '../create-pod.types';
import RepeatDiscountField from './RepeatDiscountField';
import SeriesCalendar from './SeriesCalendar';
import { usePodSeriesLimits, useSeriesPreview, type SeriesPreviewDate } from './useSeriesPreview';

const NO_DATES: SeriesPreviewDate[] = [];

/**
 * The repeat details of a Recurring pod, under its first date (its slot, or
 * its virtual window): how often it repeats — daily, weekly, every two weeks,
 * monthly or on hand-picked days — and until when. The server works out every
 * date and its slot; the host sees them on a calendar and can leave any out
 * before publishing. It publishes as ONE pod with those dates; members book
 * the dates they want, with the multi-date discount set here. Each date is
 * booked instantly at the venue's pricing, on its own; a date the venue
 * cannot take shows as "Cannot run". The One time | Recurring choice sits above the date
 * (PodRepeatModeToggle). Native twin: PodRepeatSection.
 */
export default function PodRepeatSection({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  const { control, watch, formState: { errors } } = form;
  const values = watch();
  const limits = usePodSeriesLimits(values.repeat_enabled && !values.partner_request_id);
  const { loading, error, preview } = useSeriesPreview(values);
  const custom = values.repeat_frequency === 'CUSTOM';
  const runnable = (preview?.dates ?? []).filter(
    (d) => d.available && (custom || !values.repeat_skip_dates.includes(d.start_at))
  );
  const first = values.pod_date_time;
  // Physical: a slot (Pod Request) or an instant booking's whole window.
  const booked = !!values.venue_slot_id || !!values.pod_end_date_time;
  const chosen = values.pod_mode === 'VIRTUAL' ? !!first : booked && !!first;

  // A Pod Request's slot is one agreed date — it has nothing to repeat — and
  // there is nothing to repeat before the first date is chosen.
  if (values.partner_request_id || !values.repeat_enabled || !chosen) return null;

  const maxEnd = first && limits ? addDays(first, limits.max_span_days) : null;
  return (
    <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }} data-testid="pod-repeat-section">
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
            minDate={first}
            maxDate={maxEnd}
            required
            error={!!errors.repeat_ends_on}
            helperText={
              errors.repeat_ends_on?.message ??
              (limits
                ? t('mweb.podSeries.endsOnMaxHint', { vars: { days: limits.max_span_days } })
                : t('mweb.podSeries.endsOnHint'))
            }
          />
        )}
      />
      {loading && <CircularProgress size={20} aria-label={t('mweb.a11y.loading')} />}
      {error && <Alert severity="error" data-testid="pod-repeat-error">{parseApiError(error) || t('mweb.podSeries.previewFailed')}</Alert>}
      {preview && (
        <>
          <Typography variant="body2" data-testid="pod-repeat-count" sx={{ fontWeight: 600 }} aria-live="polite">
            {t('mweb.podSeries.willCreate', { vars: { count: runnable.length, total: preview.dates.length } })}
          </Typography>
          {runnable.length < 2 && (
            <Alert severity="warning" data-testid="pod-repeat-too-few">{t('mweb.podSeries.needTwoDates')}</Alert>
          )}
        </>
      )}
      {/* Outside the preview: a tap re-asks the server, and the calendar stays put meanwhile. */}
      <SeriesCalendar form={form} dates={preview?.dates ?? NO_DATES} />
      {preview && (
        <>
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
    </Stack>
  );
}
