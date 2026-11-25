import { useTheme } from 'tamagui';
import { formatDate } from '@duncit/datetime';
import { crmFormatScore, crmIsoWeekMonday, crmSumCounts } from '@duncit/utils';

import { BarChartCard } from '@/components/BarChartCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { Analytics } from './analytics.types';

/** The Monday a week starts on, in the platform's date format; the raw value when it is not an ISO week. */
const weekLabel = (week: string) => {
  const monday = crmIsoWeekMonday(week);
  return monday ? formatDate(monday) || week : week;
};

/**
 * The portal's three charts as bar cards: how scores spread across buckets,
 * how leads classify, and the weekly trend — summed across the lead types shown.
 */
export function QualityCharts({ data }: Readonly<{ data: Analytics }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const accent = theme.accentText?.val ?? '';
  const info = theme.info?.val ?? '';
  const success = theme.success?.val ?? '';
  const dash = t('crmApp.common.dash');
  const distribution = crmSumCounts(data.by_type.map((s) => s.distribution));
  const classifications = crmSumCounts(data.by_type.map((s) => s.classifications));
  return (
    <>
      <BarChartCard
        title={t('crm.leadQualityAnalytics.distributionTitle')}
        caption={t('crm.leadQualityAnalytics.distributionHint')}
        empty={t('crm.leadQualityAnalytics.noScores')}
        testID="chart-distribution"
        rows={distribution.map((row) => ({
          key: row.key,
          label: row.label,
          segments: [{ key: 'count', value: row.count, color: accent }],
          description: t('crm.leadQualityAnalytics.countPair', {
            vars: { label: row.label, count: row.count },
          }),
        }))}
      />
      <BarChartCard
        title={t('crm.leadQualityAnalytics.classificationsTitle')}
        caption={t('crm.leadQualityAnalytics.classificationsHint')}
        empty={t('crm.leadQualityAnalytics.noScores')}
        testID="chart-classifications"
        rows={classifications.map((row) => ({
          key: row.key,
          label: row.label,
          segments: [{ key: 'count', value: row.count, color: success }],
          description: t('crm.leadQualityAnalytics.countPair', {
            vars: { label: row.label, count: row.count },
          }),
        }))}
      />
      <BarChartCard
        title={t('crm.leadQualityAnalytics.trendTitle')}
        caption={t('crm.leadQualityAnalytics.trendHint')}
        empty={t('crm.leadQualityAnalytics.noTrend')}
        testID="chart-trend"
        rows={data.trend.map((row) => ({
          key: row.week,
          label: t('crmApp.analytics.weekLabel', {
            vars: { week: weekLabel(row.week), score: crmFormatScore(row.average_score, dash) },
          }),
          segments: [{ key: 'leads', value: row.leads, color: info }],
          description: t('crmApp.analytics.weekDescription', {
            vars: {
              week: weekLabel(row.week),
              leads: row.leads,
              score: crmFormatScore(row.average_score, dash),
            },
          }),
        }))}
      />
    </>
  );
}
