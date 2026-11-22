import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { useTranslation } from '../../i18n/useTranslation';
import PageHeader from '../../components/PageHeader';
import BuyTab from './BuyTab';
import MyCardsTab from './MyCardsTab';
import OrdersTab from './OrdersTab';
import { SEGMENTED_TABS_SX } from './segmentedSx';

type GiftCardsTab = 'buy' | 'mycards' | 'orders';

/**
 * Gift Cards — buy the one Duncit gift card (by email or printed by courier),
 * manage the ones you hold and gifted, and follow your orders. Twin of the native GiftCardsScreen (rule 27); reached only
 * through the flag-gated sidebar section (`gift_cards`).
 */
export default function GiftCardsPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<GiftCardsTab>({
    items: [
      { value: 'buy', label: t('mweb.giftCards.buyTab'), testId: 'gift-cards-tab-buy' },
      { value: 'mycards', label: t('mweb.giftCards.myCardsTab'), testId: 'gift-cards-tab-cards' },
      { value: 'orders', label: t('mweb.giftCards.ordersTab'), testId: 'gift-cards-tab-orders' },
    ],
    fallback: 'buy',
  });

  return (
    <Stack
      data-testid="gift-cards-screen"
      spacing={2.5}
      sx={{ maxWidth: 760, mx: 'auto', width: '100%', py: 0.5 }}
    >
      <PageHeader testId="gift-cards-header" title={t('mweb.giftCards.title')} />
      <DuncitTabs {...tabs} idPrefix="gift-cards" variant="fullWidth" sx={SEGMENTED_TABS_SX} />
      <Box {...tabPanelProps('gift-cards', tabs.value)}>
        {tabs.value === 'buy' && <BuyTab />}
        {tabs.value === 'mycards' && <MyCardsTab />}
        {tabs.value === 'orders' && <OrdersTab />}
      </Box>
    </Stack>
  );
}
