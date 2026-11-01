import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DistributionCard } from '@duncit/ui';
import TrendChart from '../../entity-analytics/TrendChart';
import DetailDrawer from '../DetailDrawer';
import { countTrend } from '../product-trend';
import { asCount, asDuration, platformCounts, screenCounts } from '../labels';
import { PRODUCT_SCREEN, type ProductAnalyticsFilter } from '../queries';

interface Props {
  screen: string | null;
  filter: ProductAnalyticsFilter;
  onClose: () => void;
}

/** One screen: its views and people over the period, where people came from and went next, what they pressed. */
export default function ScreenDetail({ screen, filter, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(PRODUCT_SCREEN, {
    variables: { screen_name: screen ?? '', filter },
    skip: !screen,
  });
  const detail = data?.productScreen;
  const empty = t('analytics.product.empty');
  const summary = detail
    ? t('analytics.product.screens.detailSummary', {
        vars: { views: asCount(detail.views), time: asDuration(detail.avg_time_ms) },
      })
    : undefined;
  return (
    <DetailDrawer
      open={Boolean(screen)}
      title={screen ?? ''}
      subtitle={summary}
      loading={loading && !detail}
      error={error}
      onClose={onClose}
      testId="product-screen-detail"
    >
      {detail && (
        <Stack spacing={2}>
          <TrendChart
            label={t('analytics.product.screens.trend')}
            trend={countTrend('prd_screen_trend', detail.buckets, [
              { key: 'prd_series_views', values: detail.views_series },
              { key: 'prd_series_users', values: detail.users_series },
            ])}
          />
          <DistributionCard
            title={t('analytics.product.screens.cameFrom')}
            buckets={screenCounts(detail.previous_screens, t)}
            emptyText={empty}
          />
          <DistributionCard title={t('analytics.product.screens.wentNext')} buckets={detail.next_screens} emptyText={empty} />
          <DistributionCard title={t('analytics.product.screens.pressed')} buckets={detail.elements} emptyText={empty} />
          <DistributionCard
            title={t('analytics.product.screens.platforms')}
            buckets={platformCounts(detail.platforms, t)}
            emptyText={empty}
          />
        </Stack>
      )}
    </DetailDrawer>
  );
}
