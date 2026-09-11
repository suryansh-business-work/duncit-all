import { useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { Alert, Card, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import PageHeader from '../../components/PageHeader';
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
    <Stack spacing={2} sx={{ maxWidth: 560, mx: 'auto', width: '100%', py: 0.5 }}>
      <PageHeader title={t('mweb.giftCards.redeemTitle')} />
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
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
            sx={{ flexShrink: 0, minHeight: 40 }}
          >
            {t('mweb.giftCards.checkCta')}
          </DuncitButton>
        </Stack>
      </Card>
      {error && <Alert severity="error">{t('mweb.giftCards.redeemError')}</Alert>}
      {card && <GiftCardRedeemView key={card.id} card={card} currencySymbol={currencySymbol} />}
      <HowItWorksCard />
    </Stack>
  );
}
