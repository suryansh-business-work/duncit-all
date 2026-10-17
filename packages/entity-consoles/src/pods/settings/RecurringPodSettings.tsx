import { useTranslation } from '@duncit/shell';
import { Stack, Typography } from '@mui/material';
import { DEFAULT_TICKET_DISCOUNT_MAX_PCT, POD_SERIES_MAX_DATES } from '@duncit/utils';
import NumberSettingCard from './NumberSettingCard';
import MultiDateDiscountCard from './MultiDateDiscountCard';
import type { PodSettingsSectionProps } from './queries';

/**
 * Recurring pods: how many dates one may have, how far it may run, and the
 * multi-date booking discount a new one starts with. A recurring pod is ONE
 * pod; members book the dates they want and pay less the more they book.
 */
export default function RecurringPodSettings({ settings, loading, onSave }: Readonly<PodSettingsSectionProps>) {
  const { t } = useTranslation();
  const maxDates = settings?.pod_series_max_occurrences ?? POD_SERIES_MAX_DATES;
  return (
    <Stack spacing={3} data-testid="pod-settings-recurring">
      <Typography variant="h6" component="h2">{t('admin.podSettings.recurringTitle')}</Typography>
      <NumberSettingCard
        title={t('admin.podSettings.seriesMaxDatesTitle')}
        description={t('admin.podSettings.seriesMaxDatesDesc')}
        label={t('admin.podSettings.seriesMaxDatesLabel')}
        helperText={t('admin.podSettings.seriesMaxDatesMin')}
        invalidText={t('admin.podSettings.seriesMaxDatesInvalid')}
        min={2}
        max={POD_SERIES_MAX_DATES}
        loading={loading}
        value={settings?.pod_series_max_occurrences ?? null}
        onSave={(next) => onSave({ pod_series_max_occurrences: next })}
      />
      <NumberSettingCard
        title={t('admin.podSettings.seriesSpanTitle')}
        description={t('admin.podSettings.seriesSpanDesc')}
        label={t('admin.podSettings.seriesSpanLabel')}
        helperText={t('admin.podSettings.seriesSpanMin')}
        invalidText={t('admin.podSettings.seriesSpanInvalid')}
        min={7}
        max={365}
        loading={loading}
        value={settings?.pod_series_max_span_days ?? null}
        onSave={(next) => onSave({ pod_series_max_span_days: next })}
      />
      <MultiDateDiscountCard
        loading={loading}
        value={settings?.pod_multi_date_discount_tiers ?? null}
        maxDates={maxDates}
        maxPct={settings?.ticket_discount_max_pct ?? DEFAULT_TICKET_DISCOUNT_MAX_PCT}
        onSave={(next) => onSave({ pod_multi_date_discount_tiers: next })}
      />
    </Stack>
  );
}
