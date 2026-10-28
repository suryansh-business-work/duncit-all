import { useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { Alert, Card, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { PublicFinanceSettings } from '@duncit/gql-types';
import { PUBLIC_FINANCE } from '../checkout-page/queries';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardRedeemView from '../gift-cards-page/GiftCardRedeemView';
import { GIFT_CARD_BY_CODE, type GiftCard } from '../gift-cards-page/queries';

/**
 * The "Gift card code" door of the Redeem page — type the code from the email
 * or link, check it, and convert its full value into Duncit Coins. Twin of the
 * native GiftCardCodeRedeem (rule 27).
 */
export default function GiftCodeRedeem() {
  const { t } = useTranslation();
  const [codeInput, setCodeInput] = useState('');
  // Every lookup must reach the server — a cached card could report a status
  // that a redemption elsewhere has already changed.
  const [runLookup, { data, loading, error }] = useLazyQuery<{ giftCardByCode: GiftCard }>(GIFT_CARD_BY_CODE, {
    fetchPolicy: 'network-only',
  });
  const { data: financeData } = useQuery<{ publicFinanceSettings: Pick<PublicFinanceSettings, 'currency_symbol'> }>(
    PUBLIC_FINANCE,
  );

  const currencySymbol = financeData?.publicFinanceSettings?.currency_symbol ?? '₹';
  const card = data?.giftCardByCode ?? null;

  const check = async () => {
    await runLookup({ variables: { code: codeInput.trim() } });
  };

  return (
    <Stack spacing={2}>
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <TextField
            data-testid="gift-card-code"
            fullWidth
            label={t('mweb.giftCards.codeLabel')}
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            helperText={t('mweb.giftCards.codeHint')}
            slotProps={{
              htmlInput: { style: { textTransform: 'uppercase' }, maxLength: 19, 'data-testid': 'gift-card-code-input' }
            }}
          />
          <DuncitButton
            data-testid="gift-card-check"
            variant="contained"
            disabled={!codeInput.trim() || loading}
            onClick={check}
            sx={{ flexShrink: 0, minHeight: 40 }}
          >
            {t('mweb.giftCards.checkCta')}
          </DuncitButton>
        </Stack>
      </Card>
      {error && <Alert data-testid="gift-card-lookup-error" severity="error">{t('mweb.giftCards.redeemError')}</Alert>}
      {card && <GiftCardRedeemView key={card.id} card={card} currencySymbol={currencySymbol} />}
    </Stack>
  );
}
