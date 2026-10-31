import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DistributionCard } from '@duncit/ui';
import TrendChart from '../../entity-analytics/TrendChart';
import DetailDrawer from '../DetailDrawer';
import { countTrend } from '../product-trend';
import { asCount, platformCounts } from '../labels';
import { PRODUCT_ELEMENT, type ProductAnalyticsFilter, type ProductElementRow } from '../queries';

interface Props {
  element: ProductElementRow | null;
  filter: ProductAnalyticsFilter;
  onClose: () => void;
}

/** One element on one screen: presses and the people pressing over the period, and on which platforms. */
export default function ElementDetail({ element, filter, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(PRODUCT_ELEMENT, {
    variables: { screen_name: element?.screen_name ?? '', key: element?.key ?? '', filter },
    skip: !element,
  });
  const detail = data?.productElement;
  const summary = element
    ? t('analytics.product.clickstream.detailSummary', {
        vars: { screen: element.screen_name, clicks: asCount(element.clicks), users: asCount(element.unique_users) },
      })
    : undefined;
  return (
    <DetailDrawer
      open={Boolean(element)}
      title={element?.element_name || element?.key || ''}
      subtitle={summary}
      loading={loading && !detail}
      error={error}
      onClose={onClose}
      testId="product-element-detail"
    >
      {detail && (
        <Stack spacing={2}>
          <TrendChart
            label={t('analytics.product.clickstream.trend')}
            trend={countTrend('prd_element_trend', detail.buckets, [
              { key: 'prd_series_clicks', values: detail.clicks_series },
              { key: 'prd_series_users', values: detail.users_series },
            ])}
          />
          <DistributionCard
            title={t('analytics.product.screens.platforms')}
            buckets={platformCounts(detail.platforms, t)}
            emptyText={t('analytics.product.empty')}
          />
        </Stack>
      )}
    </DetailDrawer>
  );
}
