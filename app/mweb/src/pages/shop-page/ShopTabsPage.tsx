import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { SEGMENTED_TABS_SX } from '../gift-cards-page/segmentedSx';
import ShopPage from '.';
import PodRentTab from './PodRentTab';

type ShopTab = 'shop' | 'rent';

/** /shop: the Pod Shop catalogue and Pod Rent, one URL-selected switch over both. */
export default function ShopTabsPage() {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<ShopTab>[]>(
    () => [
      { value: 'shop', label: t('venueRentals.guest.shopTab'), testId: 'shop-tab-shop' },
      { value: 'rent', label: t('venueRentals.guest.rentTab'), testId: 'shop-tab-rent' },
    ],
    [t]
  );
  const tabs = useTabParam<ShopTab>({ items, fallback: 'shop' });
  return (
    <Stack spacing={2} sx={{ py: 0.5 }}>
      <PageHeader testId="shop-page-header" title={t('mweb.shop.title')} />
      <DuncitTabs {...tabs} idPrefix="shop" variant="fullWidth" sx={SEGMENTED_TABS_SX} />
      <Box {...tabPanelProps('shop', tabs.value)}>{tabs.value === 'shop' ? <ShopPage hideHeader /> : <PodRentTab />}</Box>
    </Stack>
  );
}
