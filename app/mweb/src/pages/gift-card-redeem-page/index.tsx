import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import HowItWorksCard from '../gift-cards-page/HowItWorksCard';
import { SEGMENTED_TABS_SX } from '../gift-cards-page/segmentedSx';
import GiftCodeRedeem from './GiftCodeRedeem';
import PhysicalCardRedeem from './PhysicalCardRedeem';

type RedeemMode = 'code' | 'physical';

/**
 * Redeem a gift card — the emailed/linked code, or a printed card's number and
 * scratch-panel passcode. Either way the full value lands in Duncit Coins. The
 * open door is held in the URL (`?selectedtab=physical`), so a reload or a
 * shared link keeps it. Twin of the native GiftCardRedeemScreen (rule 27).
 */
export default function GiftCardRedeemPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<RedeemMode>({
    items: [
      { value: 'code', label: t('mweb.giftCards.redeemModeCode'), testId: 'gift-card-redeem-tab-code' },
      { value: 'physical', label: t('mweb.giftCards.redeemModePhysical'), testId: 'gift-card-redeem-tab-physical' },
    ],
    fallback: 'code',
  });

  return (
    <Stack data-testid="gift-card-redeem-screen" spacing={2} sx={{ maxWidth: 560, mx: 'auto', width: '100%', py: 0.5 }}>
      <PageHeader testId="gift-card-redeem-header" title={t('mweb.giftCards.redeemTitle')} />
      <DuncitTabs
        {...tabs}
        idPrefix="gift-card-redeem"
        variant="fullWidth"
        aria-label={t('mweb.giftCards.redeemModeLabel')}
        sx={SEGMENTED_TABS_SX}
      />
      <Box {...tabPanelProps('gift-card-redeem', tabs.value)}>
        {tabs.value === 'physical' ? <PhysicalCardRedeem /> : <GiftCodeRedeem />}
      </Box>
      <HowItWorksCard />
    </Stack>
  );
}
