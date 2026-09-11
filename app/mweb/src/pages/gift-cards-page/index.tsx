import { Stack } from '@mui/material';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '../../i18n/useTranslation';
import PageHeader from '../../components/PageHeader';
import BuyTab from './BuyTab';
import MyCardsTab from './MyCardsTab';
import { SEGMENTED_TABS_SX } from './segmentedSx';

type GiftCardsTab = 'buy' | 'mycards';

/**
 * Gift Cards — buy a themed prepaid card, or manage the ones you hold and the
 * ones you gifted. Twin of the native GiftCardsScreen (rule 27); reached only
 * through the flag-gated sidebar section (`gift_cards`).
 */
export default function GiftCardsPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<GiftCardsTab>({
    items: [
      { value: 'buy', label: t('mweb.giftCards.buyTab') },
      { value: 'mycards', label: t('mweb.giftCards.myCardsTab') },
    ],
    fallback: 'buy',
  });

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 760, mx: 'auto', width: '100%', py: 0.5 }}>
      <PageHeader title={t('mweb.giftCards.title')} />
      <DuncitTabs {...tabs} variant="fullWidth" sx={SEGMENTED_TABS_SX} />
      {tabs.value === 'buy' ? <BuyTab /> : <MyCardsTab />}
    </Stack>
  );
}
