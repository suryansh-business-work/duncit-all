import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import { HEADER_ME } from '../../components/app-header/queries';
import EmptyState from '../../components/EmptyState';
import SectionHeader from '../../components/SectionHeader';
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
  const { data: headerData } = useQuery<any>(HEADER_ME, { fetchPolicy: 'cache-first' });

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
        <EmptyState icon={<CardGiftcardOutlinedIcon />} title={t('mweb.giftCards.myCardsEmpty')} />
      )}
      {owned.map((card) => (
        <MyCardTile key={card.id} card={card} currencySymbol={currencySymbol} senderName={senderName} />
      ))}
      {gifted.length > 0 && (
        <>
          <SectionHeader title={t('mweb.giftCards.giftedHeading')} />
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
