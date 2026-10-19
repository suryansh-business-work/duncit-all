import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodForm } from '../create-pod.types';
import { RepeatDiscountField } from './RepeatDiscountField';
import type { SeriesPreview } from './useSeriesPreview';

interface Props {
  form: CreatePodForm;
  preview: SeriesPreview;
  /** How many of the preview's dates will run (available and not left out). */
  runnableCount: number;
  /** A free pod has no ticket, so no multi-date discount. */
  free: boolean;
  currency: string;
}

/** Under the calendar: how many dates the series makes, the discount, and the Pod Settings limits. */
export function RepeatSeriesSummary({
  form,
  preview,
  runnableCount,
  free,
  currency,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={8}>
      <Text testID="pod-repeat-count" fontSize={14} fontWeight="600">
        {t('mweb.podSeries.willCreate', {
          vars: { count: runnableCount, total: preview.dates.length },
        })}
      </Text>
      {runnableCount < 2 ? (
        <Text testID="pod-repeat-too-few" color="$warning">
          {t('mweb.podSeries.needTwoDates')}
        </Text>
      ) : null}
      {free ? null : (
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
  );
}
