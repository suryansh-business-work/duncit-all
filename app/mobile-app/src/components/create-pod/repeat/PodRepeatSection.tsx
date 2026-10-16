import { Controller } from 'react-hook-form';
import { Spinner, Text, YStack } from 'tamagui';
import { POD_SERIES_FREQUENCIES } from '@duncit/utils';

import { PillTabs, type PillTab } from '@/components/PillTabs';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { parseDateTimeText } from '../create-pod.form';
import type { CreatePodForm } from '../create-pod.types';
import { RepeatEndDateField } from './RepeatEndDateField';
import { SeriesDatesList } from './SeriesDatesList';
import { useSeriesPreview } from './useSeriesPreview';

type RepeatMode = 'ONE_TIME' | 'RECURRING';

const MODES: readonly PillTab<RepeatMode>[] = [
  { key: 'ONE_TIME', labelKey: 'mweb.podSeries.oneTime' },
  { key: 'RECURRING', labelKey: 'mweb.podSeries.recurring' },
];

const FREQUENCIES = POD_SERIES_FREQUENCIES.map((f) => ({ key: f.value, labelKey: f.labelKey }));

/**
 * One time or Recurring, under the pod's first date — mWeb's PodRepeatSection
 * (rule 27). Recurring repeats that date daily, weekly or every two weeks until
 * an end day; the server lists every date and its slot, and the host can
 * untick any of them before publishing.
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
  // A Pod Request's slot is one agreed date — it has nothing to repeat.
  if (values.partner_request_id) return null;

  const runnable = (preview?.dates ?? []).filter(
    (d) => d.available && !values.repeat_skip_dates.includes(d.start_at),
  );
  const toggleDate = (startAt: string, include: boolean) => {
    const rest = values.repeat_skip_dates.filter((d) => d !== startAt);
    setValue('repeat_skip_dates', include ? rest : [...rest, startAt], { shouldDirty: true });
  };

  return (
    <SurfaceCard gap={12} testID="pod-repeat-section">
      <Text fontSize={15} fontWeight="600" role="heading">
        {t('mweb.podSeries.title')}
      </Text>
      <PillTabs
        tabs={MODES}
        value={values.repeat_enabled ? 'RECURRING' : 'ONE_TIME'}
        onChange={(mode) => setValue('repeat_enabled', mode === 'RECURRING', { shouldDirty: true })}
        ariaLabel={t('mweb.podSeries.title')}
        testIDPrefix="pod-repeat"
      />
      {values.repeat_enabled ? (
        <YStack gap={12}>
          <Text fontSize={13} color="$muted">
            {t('mweb.podSeries.frequencyLabel')}
          </Text>
          <Controller
            control={control}
            name="repeat_frequency"
            render={({ field }) => (
              <PillTabs
                tabs={FREQUENCIES}
                value={field.value}
                onChange={field.onChange}
                ariaLabel={t('mweb.podSeries.frequencyLabel')}
                testIDPrefix="pod-repeat-frequency"
              />
            )}
          />
          <Controller
            control={control}
            name="repeat_ends_on"
            render={({ field }) => (
              <RepeatEndDateField
                label={t('mweb.podSeries.endsOnLabel')}
                hint={t('mweb.podSeries.endsOnHint')}
                value={field.value}
                onChange={field.onChange}
                minDate={parseDateTimeText(values.pod_date_time_text)}
                error={errors.repeat_ends_on?.message}
              />
            )}
          />
          {loading ? <Spinner aria-label={t('mweb.a11y.loading')} /> : null}
          {error ? (
            <Text testID="pod-repeat-error" color="$danger">
              {error}
            </Text>
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
              <SeriesDatesList
                dates={preview.dates}
                skipped={values.repeat_skip_dates}
                onToggle={toggleDate}
              />
              <Text fontSize={12} color="$muted">
                {t('mweb.podSeries.limitsHint', {
                  vars: { max: preview.max_occurrences, days: preview.max_span_days },
                })}
              </Text>
            </YStack>
          ) : null}
        </YStack>
      ) : null}
    </SurfaceCard>
  );
}
