import { useMemo } from 'react';
import { Box } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import BarBreakdownChart from '../analytics/BarBreakdownChart';
import type { SocialPostDetail } from '../queries';

/**
 * The post's numbers, each beside the account's usual one — a like count
 * means nothing on its own, it means something against 80.
 */
export default function PostMetrics({ detail }: Readonly<{ detail: SocialPostDetail }>) {
  const { t, locale } = useTranslation();
  const { post, average } = detail;
  const number = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 });
  const vsAverage = (value: number) => t('marketing.social.accountAverage', { vars: { value: number(value) } });

  const tiles = [
    { key: 'likes', label: t('marketing.social.colLikes'), value: number(post.likes), hint: vsAverage(average.likes) },
    { key: 'comments', label: t('marketing.social.colComments'), value: number(post.comments), hint: vsAverage(average.comments) },
    { key: 'shares', label: t('marketing.social.colShares'), value: number(post.shares), hint: vsAverage(average.shares) },
    {
      key: 'views',
      label: t('marketing.social.colViews'),
      value: post.views === null ? EM_DASH : number(post.views),
      hint: vsAverage(average.views),
    },
    {
      key: 'rate',
      label: t('marketing.social.colEngagementRate'),
      value: `${number(post.engagement_rate)}%`,
      hint: t('marketing.social.kpiEngagementRateHint'),
    },
  ];

  // Views are left out of the chart: on its own scale it would flatten the other three.
  const series = useMemo(
    () => [
      { label: t('marketing.social.thisPost'), values: [post.likes, post.comments, post.shares] },
      { label: t('marketing.social.accountAverageLabel'), values: [average.likes, average.comments, average.shares] },
    ],
    [post, average, t]
  );
  const labels = useMemo(
    () => [t('marketing.social.colLikes'), t('marketing.social.colComments'), t('marketing.social.colShares')],
    [t]
  );

  return (
    <>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
        {tiles.map((tile) => (
          <StatCard key={tile.key} label={tile.label} value={tile.value} hint={tile.hint} />
        ))}
      </Box>
      <BarBreakdownChart
        labels={labels}
        series={series}
        horizontal={false}
        ariaLabel={t('marketing.social.comparedToAverage')}
        testId="social-post-vs-average"
      />
    </>
  );
}
