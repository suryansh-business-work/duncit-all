import { useMemo } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { BackHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { BrandAnalyticsPanel, BrandLogsPanel, useTranslation } from '@duncit/shell';
import { MY_BRAND, type EcommBrand } from '../queries';
import BrandDetailsHeader from './BrandDetailsHeader';
import BrandOverviewTab from './BrandOverviewTab';

const BRANDS_PATH = '/ecomm-brand';
const TAB_PREFIX = 'brand-details';
type BrandTab = 'overview' | 'logs' | 'analytics';

/**
 * `/ecomm-brand/:brandId` — one of the partner's own brands: going live,
 * setup progress, its activity log and its sales. Rows of "Your brands" open here.
 */
export default function BrandDetailsRoute() {
  const { t } = useTranslation();
  const { brandId = '' } = useParams<{ brandId: string }>();
  const { data, loading, error, refetch } = useQuery<{ myEcommBrand: EcommBrand | null }>(MY_BRAND, {
    variables: { brand_doc_id: brandId },
    fetchPolicy: 'cache-and-network',
  });
  const items = useMemo(
    () => [
      { value: 'overview' as const, label: t('partners.brandDetails.tabOverview') },
      { value: 'logs' as const, label: t('partners.brandDetails.tabLogs') },
      { value: 'analytics' as const, label: t('partners.brandDetails.tabAnalytics') },
    ],
    [t]
  );
  const tabs = useTabParam<BrandTab>({ items, fallback: 'overview' });
  const brand = data?.myEcommBrand ?? null;
  const back = <BackHeader backTo={BRANDS_PATH} backAriaLabel={t('partners.brandDetails.back')} title={brand?.brand_name ?? ''} />;

  if (loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 5 }} role="status">
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }
  if (error && !brand) {
    return (
      <Stack spacing={2}>
        {back}
        <Alert
          severity="error"
          action={
            <DuncitButton color="inherit" size="small" onClick={() => refetch()}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {parseApiError(error)}
        </Alert>
      </Stack>
    );
  }
  if (!brand) {
    return (
      <Stack spacing={2}>
        {back}
        <Alert severity="warning">{t('partners.brandDetails.notFound')}</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }} data-testid="brand-details-page">
      {back}
      <BrandDetailsHeader brand={brand} />
      <DuncitTabs {...tabs} idPrefix={TAB_PREFIX} aria-label={t('partners.brandDetails.tabsLabel')} searchable={false} />
      <Box {...tabPanelProps(TAB_PREFIX, tabs.value)}>
        {tabs.value === 'overview' && <BrandOverviewTab brand={brand} />}
        {tabs.value === 'logs' && <BrandLogsPanel brandId={brand.id} tableId="partners-app-brand-logs" />}
        {tabs.value === 'analytics' && <BrandAnalyticsPanel brandId={brand.id} />}
      </Box>
    </Stack>
  );
}
