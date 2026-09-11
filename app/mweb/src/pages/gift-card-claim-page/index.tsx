import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Alert, CircularProgress, Stack } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { PUBLIC_FINANCE } from '../checkout-page/queries';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardRedeemView from '../gift-cards-page/GiftCardRedeemView';
import { GIFT_CARD_BY_CODE, type GiftCard } from '../gift-cards-page/queries';

/**
 * The shared gift card link (/gift-card/CODE) — shows the card, who sent it
 * and their message, then redeems it into Duncit Coins right here. Holding the
 * code is holding the value, so any signed-in visitor may claim it.
 */
export default function GiftCardClaimPage() {
  const { t } = useTranslation();
  const { code = '' } = useParams();
  // network-only: another holder may have redeemed this code since it was
  // cached, and a stale ACTIVE here would promise coins the redeem call denies.
  const { data, loading, error } = useQuery<{ giftCardByCode: GiftCard }>(GIFT_CARD_BY_CODE, {
    variables: { code },
    fetchPolicy: 'network-only',
    skip: !code,
  });
  const { data: financeData } = useQuery<any>(PUBLIC_FINANCE);

  const currencySymbol = financeData?.publicFinanceSettings?.currency_symbol ?? '₹';
  const card = data?.giftCardByCode ?? null;

  return (
    <Stack spacing={2} sx={{ maxWidth: 560, mx: 'auto', width: '100%', py: 0.5 }}>
      <PageHeader title={t('mweb.giftCards.title')} />
      {loading && !card && (
        <Stack
          sx={{
            alignItems: "center",
            py: 4
          }}>
          <CircularProgress size={24} />
        </Stack>
      )}
      {error && <Alert severity="error">{t('mweb.giftCards.redeemError')}</Alert>}
      {card && <GiftCardRedeemView card={card} currencySymbol={currencySymbol} />}
    </Stack>
  );
}
