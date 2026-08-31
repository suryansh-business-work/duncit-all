import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import { HEADER_DATA } from '../../components/app-header/queries';
import { PUBLIC_FINANCE } from '../checkout-page/queries';
import { useTranslation } from '../../i18n/useTranslation';
import MyCardTile from './MyCardTile';
import { MY_GIFT_CARDS, type MyGiftCards } from './queries';

/** My cards: the ones the caller holds (or redeemed), then the ones they
 * gifted away. */
export default function MyCardsTab() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ myGiftCards: MyGiftCards }>(MY_GIFT_CARDS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: financeData } = useQuery<any>(PUBLIC_FINANCE);
  // Already cached by the header — the share message needs the holder's name.
  const { data: headerData } = useQuery<any>(HEADER_DATA, { fetchPolicy: 'cache-first' });

  const currencySymbol = financeData?.publicFinanceSettings?.currency_symbol ?? '₹';
  const senderName = headerData?.me?.full_name ?? '';
  const owned = data?.myGiftCards?.owned ?? [];
  const gifted = data?.myGiftCards?.gifted ?? [];

  if (loading && !data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 4
        }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{t('mweb.giftCards.loadError')}</Alert>}
      {!error && owned.length === 0 && gifted.length === 0 && (
        <Alert severity="info">{t('mweb.giftCards.myCardsEmpty')}</Alert>
      )}
      {owned.map((card) => (
        <MyCardTile key={card.id} card={card} currencySymbol={currencySymbol} senderName={senderName} />
      ))}
      {gifted.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            {t('mweb.giftCards.giftedHeading')}
          </Typography>
          {gifted.map((card) => (
            <MyCardTile
              key={card.id}
              card={card}
              currencySymbol={currencySymbol}
              senderName={senderName}
              showRecipient
            />
          ))}
        </>
      )}
    </Stack>
  );
}
