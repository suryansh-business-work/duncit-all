import { Box, Stack, Typography } from '@mui/material';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '../../i18n/useTranslation';
import BuyTab from './BuyTab';
import MyCardsTab from './MyCardsTab';

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
    <Box sx={{ p: 2 }}>
      <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
        <Typography variant="h6" fontWeight={700}>
          {t('mweb.giftCards.title')}
        </Typography>
        <DuncitTabs {...tabs} />
        {tabs.value === 'buy' ? <BuyTab /> : <MyCardsTab />}
      </Stack>
    </Box>
  );
}
