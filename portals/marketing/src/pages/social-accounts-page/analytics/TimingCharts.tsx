import { useMemo } from 'react';
import { Box } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { PLATFORM_LABEL } from '../copy';
import type { SocialAnalytics } from '../queries';
import { mondayFirstWeekdays } from '../publish/calendar-grid';
import BarBreakdownChart from './BarBreakdownChart';
import { ranked } from './ranked';

/** Top posts are named by the start of their text — enough to recognise one. */
const POST_LABEL = 40;

/**
 * Where and when posts do best: by network, by weekday and by hour (each an
 * average per post, so a busy Tuesday cannot outrank one great Sunday), and
 * the period's best posts.
 */
export default function TimingCharts({ analytics }: Readonly<{ analytics: SocialAnalytics }>) {
  const { t } = useTranslation();
  const { formatTime } = useDateFormat();
  const perPost = t('marketing.social.avgPerPost');

  const byNetwork = useMemo(() => {
    const rows = ranked(analytics.by_platform, (row) => row.engagement);
    return {
      labels: rows.map((row) => t(PLATFORM_LABEL[row.platform])),
      series: [{ label: t('marketing.social.kpiEngagement'), values: rows.map((row) => row.engagement) }],
    };
  }, [analytics.by_platform, t]);
  const weekdays = useMemo(() => ({ labels: mondayFirstWeekdays(), series: [{ label: perPost, values: analytics.by_weekday }] }), [analytics.by_weekday, perPost]);
  const hours = useMemo(
    () => ({
      // The admin's clock format, so a 12-hour portal reads "6:00 PM" rather than "18".
      labels: analytics.by_hour.map((_, hour) => formatTime(new Date(2024, 0, 1, hour))),
      series: [{ label: perPost, values: analytics.by_hour }],
    }),
    [analytics.by_hour, formatTime, perPost]
  );
  const topPosts = useMemo(
    () => ({
      labels: analytics.top_posts.map((post) => `${t(PLATFORM_LABEL[post.platform])} · ${post.text.slice(0, POST_LABEL)}`),
      series: [{ label: t('marketing.social.kpiEngagement'), values: analytics.top_posts.map((post) => post.engagement) }],
    }),
    [analytics.top_posts, t]
  );

  const networkTitle = t('marketing.social.byNetworkTitle');
  const weekdayTitle = t('marketing.social.bestDayTitle');
  const hourTitle = t('marketing.social.bestHourTitle');
  const topTitle = t('marketing.social.topPostsTitle');

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
      <SectionCard title={networkTitle}>
        <BarBreakdownChart labels={byNetwork.labels} series={byNetwork.series} ariaLabel={networkTitle} testId="social-chart-by-network" />
      </SectionCard>
      <SectionCard title={topTitle}>
        <BarBreakdownChart labels={topPosts.labels} series={topPosts.series} ariaLabel={topTitle} testId="social-chart-top-posts" />
      </SectionCard>
      <SectionCard title={weekdayTitle} subtitle={t('marketing.social.bestTimeSubtitle')}>
        <BarBreakdownChart labels={weekdays.labels} series={weekdays.series} horizontal={false} ariaLabel={weekdayTitle} testId="social-chart-weekday" />
      </SectionCard>
      <SectionCard title={hourTitle} subtitle={t('marketing.social.bestTimeSubtitle')}>
        <BarBreakdownChart labels={hours.labels} series={hours.series} horizontal={false} ariaLabel={hourTitle} testId="social-chart-hour" />
      </SectionCard>
    </Box>
  );
}
