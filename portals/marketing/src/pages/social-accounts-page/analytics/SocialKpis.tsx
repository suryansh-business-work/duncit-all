import { Box } from '@mui/material';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { SocialAnalytics } from '../queries';

interface Props {
  data: SocialAnalytics | undefined;
  loading: boolean;
}

/** The period in six numbers — each tile's hint says what it counts. */
export default function SocialKpis({ data, loading }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const number = (value: number | undefined) => (value ?? 0).toLocaleString(locale);
  const tiles = [
    { key: 'followers', label: t('marketing.social.kpiFollowers'), value: number(data?.followers) },
    { key: 'posts', label: t('marketing.social.kpiPosts'), value: number(data?.posts), hint: t('marketing.social.kpiPostsHint') },
    {
      key: 'engagement',
      label: t('marketing.social.kpiEngagement'),
      value: number(data?.engagement),
      hint: t('marketing.social.kpiEngagementHint'),
    },
    {
      key: 'engagement-rate',
      label: t('marketing.social.kpiEngagementRate'),
      value: `${(data?.engagement_rate ?? 0).toLocaleString(locale, { maximumFractionDigits: 2 })}%`,
      hint: t('marketing.social.kpiEngagementRateHint'),
    },
    { key: 'views', label: t('marketing.social.kpiViews'), value: number(data?.views), hint: t('marketing.social.kpiViewsHint') },
    {
      key: 'flagged',
      label: t('marketing.social.kpiFlagged'),
      value: number(data?.sentiment.flagged),
      hint: t('marketing.social.kpiFlaggedHint'),
    },
  ];

  return (
    <Box
      sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' } }}
      data-testid="social-kpis"
    >
      {tiles.map((tile) => (
        <StatCard key={tile.key} label={tile.label} value={tile.value} hint={tile.hint} loading={loading && !data} />
      ))}
    </Box>
  );
}
