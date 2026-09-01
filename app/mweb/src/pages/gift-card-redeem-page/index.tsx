import { useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { PUBLIC_FINANCE } from '../checkout-page/queries';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardRedeemView from '../gift-cards-page/GiftCardRedeemView';
import HowItWorksCard from '../gift-cards-page/HowItWorksCard';
import { GIFT_CARD_BY_CODE, type GiftCard } from '../gift-cards-page/queries';

/**
 * Redeem a gift card — type the code from the email or link, check it, and
 * convert its full value into Duncit Coins. Twin of the native
 * GiftCardRedeemScreen (rule 27).
 */
export default function GiftCardRedeemPage() {
  const { t } = useTranslation();
  const [codeInput, setCodeInput] = useState('');
  // Every lookup must reach the server — a cached card could report a status
  // that a redemption elsewhere has already changed.
  const [runLookup, { data, loading, error }] = useLazyQuery<{ giftCardByCode: GiftCard }>(GIFT_CARD_BY_CODE, {
    fetchPolicy: 'network-only',
  });
  const { data: financeData } = useQuery<any>(PUBLIC_FINANCE);

  const currencySymbol = financeData?.publicFinanceSettings?.currency_symbol ?? '₹';
  const card = data?.giftCardByCode ?? null;

  const check = async () => {
    await runLookup({ variables: { code: codeInput.trim() } });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2} sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
        <Box>
          <Typography variant="h6" sx={{
            fontWeight: 700
          }}>
            {t('mweb.giftCards.redeemTitle')}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mt: 0.5
            }}>
            {t('mweb.giftCards.redeemSubtitle')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "flex-start"
        }}>
          <TextField
            fullWidth
            label={t('mweb.giftCards.codeLabel')}
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            helperText={t('mweb.giftCards.codeHint')}
            slotProps={{
              htmlInput: { style: { textTransform: 'uppercase' }, maxLength: 19 }
            }}
          />
          <DuncitButton
            variant="contained"
            disabled={!codeInput.trim() || loading}
            onClick={check}
            sx={{ borderRadius: 999, fontWeight: 700, mt: 1, flexShrink: 0 }}
          >
            {t('mweb.giftCards.checkCta')}
          </DuncitButton>
        </Stack>
        {error && <Alert severity="error">{t('mweb.giftCards.redeemError')}</Alert>}
        {card && <GiftCardRedeemView key={card.id} card={card} currencySymbol={currencySymbol} />}
        <HowItWorksCard />
      </Stack>
    </Box>
  );
}
