import { addDays } from 'date-fns';
import { Controller } from 'react-hook-form';
import { Spinner, Text, YStack } from 'tamagui';
import { POD_SERIES_FREQUENCIES, ymdInZone } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useTranslation } from '@/hooks/useTranslation';
import { ChipSelectField } from '../ChipSelectField';
import { parseDateTimeText } from '../create-pod.form';
import type { CreatePodForm } from '../create-pod.types';
import { RepeatDiscountField } from './RepeatDiscountField';
import { RepeatEndDateField } from './RepeatEndDateField';
import { SeriesCalendar } from './SeriesCalendar';
import { seriesDayMarks, type SeriesDayMark } from './series-calendar';
import { useSeriesLimits, useSeriesPreview } from './useSeriesPreview';

const toggled = (list: readonly string[], item: string): string[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item].sort();

/**
 * How a recurring pod repeats, once its first date is chosen — mWeb's
 * PodRepeatSection (rule 27). Daily, weekly, every two weeks, monthly (same
 * day) or hand-picked days, until an end day; the server lists every date and
 * its slot on the calendar, and the host can leave any of them out before
 * publishing. It publishes as ONE pod with those dates, which members book
 * with the multi-date discount set here. One time / Recurring: RepeatModeToggle.
 */
export function PodRepeatSection({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const values = watch();
  const { loading, error, preview } = useSeriesPreview(values, fmt.timeZone);
  const limits = useSeriesLimits(values.repeat_enabled);
  const { currency } = usePublicFinance();
  const first = parseDateTimeText(values.pod_date_time_text);
  const firstChosen = values.pod_mode === 'PHYSICAL' ? !!values.venue_slot_id : !!first;
  const firstDay = first ? ymdInZone(first.toISOString(), fmt.timeZone) : null;
  if (values.partner_request_id || !values.repeat_enabled || !firstChosen || !first || !firstDay)
    return null;

  const custom = values.repeat_frequency === 'CUSTOM';
  const dates = preview?.dates ?? [];
  const runnable = dates.filter(
    (d) => d.available && !values.repeat_skip_dates.includes(d.start_at),
  );
  const marks = seriesDayMarks(
    dates,
    values.repeat_skip_dates,
    custom ? values.repeat_custom_days : [],
    fmt.timeZone,
  );
  const toggleDay = (day: string, mark: SeriesDayMark | undefined) => {
    if (custom) {
      setValue('repeat_custom_days', toggled(values.repeat_custom_days, day), {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else if (mark?.startAt) {
      setValue('repeat_skip_dates', toggled(values.repeat_skip_dates, mark.startAt), {
        shouldDirty: true,
      });
    }
  };

  return (
    <SurfaceCard gap={12} testID="pod-repeat-section">
      <Controller
        control={control}
        name="repeat_frequency"
        render={({ field }) => (
          <ChipSelectField
            label={t('mweb.podSeries.frequencyLabel')}
            options={POD_SERIES_FREQUENCIES.map((f) => ({ value: f.value, label: t(f.labelKey) }))}
            value={field.value}
            onChange={(next) => {
              const picked = POD_SERIES_FREQUENCIES.find((f) => f.value === next);
              if (picked) field.onChange(picked.value);
            }}
            testID="pod-repeat-frequency"
          />
        )}
      />
      <Controller
        control={control}
        name="repeat_ends_on"
        render={({ field }) => (
          <RepeatEndDateField
            label={t('mweb.podSeries.endsOnLabel')}
            hint={
              limits
                ? t('mweb.podSeries.endsOnMaxHint', { vars: { days: limits.max_span_days } })
                : t('mweb.podSeries.endsOnHint')
            }
            value={field.value}
            onChange={field.onChange}
            minDate={first}
            maxDate={limits ? addDays(first, limits.max_span_days) : null}
            error={errors.repeat_ends_on?.message}
          />
        )}
      />
      {loading ? <Spinner aria-label={t('mweb.a11y.loading')} /> : null}
      {error ? (
        <Text testID="pod-repeat-error" color="$danger" role="alert">
          {error}
        </Text>
      ) : null}
      {values.repeat_ends_on ? (
        <YStack gap={8}>
          <Text fontSize={14} fontWeight="600" role="heading">
            {t('mweb.podSeries.calendarTitle')}
          </Text>
          <Text fontSize={12} color="$muted">
            {custom ? t('mweb.podSeries.customHint') : t('mweb.podSeries.calendarHint')}
          </Text>
          <SeriesCalendar
            marks={marks}
            firstDay={firstDay}
            endDay={values.repeat_ends_on}
            custom={custom}
            onToggleDay={toggleDay}
          />
          {errors.repeat_custom_days?.message ? (
            <Text testID="pod-repeat-custom-error" fontSize={12} color="$danger" role="alert">
              {errors.repeat_custom_days.message}
            </Text>
          ) : null}
        </YStack>
      ) : null}
      {preview ? (
        <YStack gap={8}>
          <Text testID="pod-repeat-count" fontSize={14} fontWeight="600">
            {t('mweb.podSeries.willCreate', {
              vars: { count: runnable.length, total: preview.dates.length },
            })}
          </Text>
          {runnable.length < 2 ? (
            <Text testID="pod-repeat-too-few" color="$warning">
              {t('mweb.podSeries.needTwoDates')}
            </Text>
          ) : null}
          {values.pod_type === 'FREE' ? null : (
            <RepeatDiscountField
              form={form}
              defaults={preview.default_multi_date_discount_tiers}
              maxDates={preview.max_occurrences}
              maxPct={preview.max_discount_pct}
              currency={currency}
            />
          )}
          <Text fontSize={12} color="$muted">
            {t('mweb.podSeries.limitsHint', {
              vars: { max: preview.max_occurrences, days: preview.max_span_days },
            })}
          </Text>
        </YStack>
      ) : null}
    </SurfaceCard>
  );
}
