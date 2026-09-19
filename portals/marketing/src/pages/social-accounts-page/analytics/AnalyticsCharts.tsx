import { useMemo } from 'react';
import { Box } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { formatDay, useTranslation } from '@duncit/app-settings';
import type { SocialAnalytics, SocialSeries } from '../queries';
import LineTrendChart from './LineTrendChart';
import BarBreakdownChart from './BarBreakdownChart';
import { ranked } from './ranked';

const SERIES_LABEL: Record<SocialSeries['key'], string> = {
  likes: 'marketing.social.seriesLikes',
  comments: 'marketing.social.seriesComments',
  shares: 'marketing.social.seriesShares',
};

/** The period over time and by account: engagement, followers, who drove it, how comments read. */
export default function AnalyticsCharts({ analytics }: Readonly<{ analytics: SocialAnalytics }>) {
  const { t } = useTranslation();
  const labels = useMemo(() => analytics.days.map((day) => formatDay(day)), [analytics.days]);

  const engagement = useMemo(
    () => analytics.engagement_series.map((series) => ({ label: t(SERIES_LABEL[series.key]), values: series.values })),
    [analytics.engagement_series, t]
  );
  const followers = useMemo(
    () => [{ label: t('marketing.social.kpiFollowers'), values: analytics.follower_series }],
    [analytics.follower_series, t]
  );
  const byAccount = useMemo(() => {
    const rows = ranked(analytics.by_account, (row) => row.engagement);
    return { labels: rows.map((row) => row.name), series: [{ label: t('marketing.social.kpiEngagement'), values: rows.map((row) => row.engagement) }] };
  }, [analytics.by_account, t]);
  const sentiment = useMemo(
    () => ({
      labels: [
        t('marketing.social.sentimentPositive'),
        t('marketing.social.sentimentNeutral'),
        t('marketing.social.sentimentNegative'),
      ],
      series: [
        {
          label: t('marketing.social.seriesComments'),
          values: [analytics.sentiment.positive, analytics.sentiment.neutral, analytics.sentiment.negative],
        },
      ],
    }),
    [analytics.sentiment, t]
  );

  const engagementTitle = t('marketing.social.engagementTitle');
  const followersTitle = t('marketing.social.followersTitle');
  const byAccountTitle = t('marketing.social.byAccountTitle');
  const sentimentTitle = t('marketing.social.sentimentTitle');

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
      <SectionCard title={engagementTitle} subtitle={t('marketing.social.engagementSubtitle')}>
        <LineTrendChart labels={labels} series={engagement} ariaLabel={engagementTitle} testId="social-chart-engagement" />
      </SectionCard>
      <SectionCard title={followersTitle} subtitle={t('marketing.social.followersSubtitle')}>
        <LineTrendChart labels={labels} series={followers} ariaLabel={followersTitle} testId="social-chart-followers" />
      </SectionCard>
      <SectionCard title={byAccountTitle}>
        <BarBreakdownChart labels={byAccount.labels} series={byAccount.series} ariaLabel={byAccountTitle} testId="social-chart-by-account" />
      </SectionCard>
      <SectionCard title={sentimentTitle} subtitle={t('marketing.social.sentimentSubtitle')}>
        <BarBreakdownChart labels={sentiment.labels} series={sentiment.series} ariaLabel={sentimentTitle} testId="social-chart-sentiment" />
      </SectionCard>
    </Box>
  );
}
