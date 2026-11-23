import { useMemo } from 'react';
import { Box } from '@mui/material';
import { useTranslation, type Translate } from '@duncit/shell';
import type { LeadQualityAnalytics } from '../../api/leadQuality.gql';
import { ChartSection } from './AnalyticsSection';
import { CountBarChart, ScoreTrendChart } from './AnalyticsCharts';
import AnalyticsTable from './AnalyticsTable';
import { countColumns, trendColumns } from './analyticsColumns';
import { formatScore, formatWeek, sumCounts, type CountRow, type TrendRow } from './analyticsData';

const countRowId = (row: CountRow) => row.key;
const searchCount = (row: CountRow) => row.label;
const trendRowId = (row: TrendRow) => row.week;
const searchTrend = (row: TrendRow) => `${row.week} ${formatWeek(row.week)}`;

const countPairs = (t: Translate, rows: readonly CountRow[]) =>
  rows.map((row) => t('crm.leadQualityAnalytics.countPair', { vars: { label: row.label, count: row.count } })).join(', ');

export const TWO_COLUMNS = { display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2 } as const;

/**
 * The score distribution, the classification counts and the weekly trend, each
 * with a text alternative carrying its numbers and a table view of them.
 */
export default function QualityCharts({ data }: Readonly<{ data: LeadQualityAnalytics }>) {
  const { t } = useTranslation();
  const distribution = useMemo(() => sumCounts(data.by_type.map((stats) => stats.distribution)), [data.by_type]);
  const classifications = useMemo(() => sumCounts(data.by_type.map((stats) => stats.classifications)), [data.by_type]);
  const columns = useMemo(
    () => ({
      buckets: countColumns(t, t('crm.leadQualityAnalytics.scoreRange')),
      classes: countColumns(t, t('crm.leadQualityAnalytics.classification')),
      trend: trendColumns(t),
    }),
    [t]
  );
  const leadsLabel = t('crm.leadQualityAnalytics.leads');
  const trendSummary = t('crm.leadQualityAnalytics.trendSummary', {
    vars: {
      values: data.trend
        .map((row) => t('crm.leadQualityAnalytics.weekPair', { vars: { week: formatWeek(row.week), score: formatScore(row.average_score), leads: row.leads } }))
        .join('; '),
    },
  });

  return (
    <>
      <Box sx={TWO_COLUMNS}>
        <ChartSection
          title={t('crm.leadQualityAnalytics.distributionTitle')}
          subtitle={t('crm.leadQualityAnalytics.distributionHint')}
          testId="distribution"
          chart={
            <CountBarChart
              rows={distribution}
              seriesLabel={leadsLabel}
              summary={t('crm.leadQualityAnalytics.distributionSummary', { vars: { values: countPairs(t, distribution) } })}
              emptyText={t('crm.leadQualityAnalytics.noScores')}
            />
          }
          table={
            <AnalyticsTable
              tableId="crm-lead-quality-distribution"
              ariaLabel={t('crm.leadQualityAnalytics.distributionTitle')}
              rows={distribution}
              columns={columns.buckets}
              getRowId={countRowId}
              searchOf={searchCount}
              emptyText={t('crm.leadQualityAnalytics.noScores')}
            />
          }
        />
        <ChartSection
          title={t('crm.leadQualityAnalytics.classificationsTitle')}
          subtitle={t('crm.leadQualityAnalytics.classificationsHint')}
          testId="classifications"
          chart={
            <CountBarChart
              horizontal
              rows={classifications}
              seriesLabel={leadsLabel}
              summary={t('crm.leadQualityAnalytics.classificationsSummary', { vars: { values: countPairs(t, classifications) } })}
              emptyText={t('crm.leadQualityAnalytics.noScores')}
            />
          }
          table={
            <AnalyticsTable
              tableId="crm-lead-quality-classifications"
              ariaLabel={t('crm.leadQualityAnalytics.classificationsTitle')}
              rows={classifications}
              columns={columns.classes}
              getRowId={countRowId}
              searchOf={searchCount}
              emptyText={t('crm.leadQualityAnalytics.noScores')}
            />
          }
        />
      </Box>
      <ChartSection
        title={t('crm.leadQualityAnalytics.trendTitle')}
        subtitle={t('crm.leadQualityAnalytics.trendHint')}
        testId="trend"
        chart={<ScoreTrendChart rows={data.trend} summary={trendSummary} emptyText={t('crm.leadQualityAnalytics.noTrend')} />}
        table={
          <AnalyticsTable
            tableId="crm-lead-quality-trend"
            ariaLabel={t('crm.leadQualityAnalytics.trendTitle')}
            rows={data.trend}
            columns={columns.trend}
            getRowId={trendRowId}
            searchOf={searchTrend}
            emptyText={t('crm.leadQualityAnalytics.noTrend')}
          />
        }
      />
    </>
  );
}
