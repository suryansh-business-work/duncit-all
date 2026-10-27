import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Chip, Grid, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import DetailHeader from '../../../components/detail/DetailHeader';
import DetailPageState, { isNotFoundError } from '../../../components/detail/DetailPageState';
import CoinCreditSection from '../../../components/detail/CoinCreditSection';
import CardSummarySection from './detail/CardSummarySection';
import PeopleSection from './detail/PeopleSection';
import PaymentSection from './detail/PaymentSection';
import LedgerSection from './detail/LedgerSection';
import { GIFT_CARD_ADMIN_DETAIL, type GiftCardAdminDetail } from './detail/queries';
import { GIFT_CARD_CURRENCY } from './queries';
import { STATUS_COLORS, displayStatus, statusLabels } from './cells';

/**
 * Loyalty > Virtual Gift Cards > one card — everything about it on one page:
 * the card and its artwork, who bought it, who it was for and who redeemed it,
 * the payment behind it (with its issue and email steps), its own ledger, and
 * the Duncit Coin credit its redemption wrote.
 */
export default function GiftCardDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ giftCardAdminDetail: GiftCardAdminDetail }>(
    GIFT_CARD_ADMIN_DETAIL,
    { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' }
  );
  const { data: currencyData } = useQuery<{ publicFinanceSettings?: { currency_symbol?: string } }>(
    GIFT_CARD_CURRENCY,
    { fetchPolicy: 'cache-first' }
  );
  const detail = data?.giftCardAdminDetail;
  // The payment's own symbol is what the money was charged in; the finance
  // setting is the fallback for a card whose payment record is gone.
  const currencySymbol =
    detail?.payment?.currency_symbol || currencyData?.publicFinanceSettings?.currency_symbol || '₹';

  return (
    <DetailPageState
      loading={loading && !detail}
      error={error}
      notFound={isNotFoundError(error) || (!loading && !error && !detail)}
      onRetry={() => refetch()}
    >
      {detail && (
        <Stack spacing={2.5}>
          <DetailHeader
            backTo="/gift-cards/virtual/cards"
            backLabel={t('loyalty.virtual.backToCards')}
            title={detail.card.code}
            subtitle={t('loyalty.virtual.detailSubtitle')}
            status={
              <Chip
                size="small"
                variant="outlined"
                color={STATUS_COLORS[displayStatus(detail.card)]}
                label={statusLabels(t)[displayStatus(detail.card)]}
                sx={{ fontWeight: 800 }}
              />
            }
          />
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={2.5}>
                <CardSummarySection card={detail.card} currencySymbol={currencySymbol} />
                <PeopleSection card={detail.card} phone={detail.payment?.user_phone ?? null} />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack spacing={2.5}>
                <CoinCreditSection credit={detail.coin_credit} />
                <LedgerSection rows={detail.transactions} currencySymbol={currencySymbol} />
              </Stack>
            </Grid>
            <Grid size={12}>
              <PaymentSection payment={detail.payment} />
            </Grid>
          </Grid>
        </Stack>
      )}
    </DetailPageState>
  );
}
