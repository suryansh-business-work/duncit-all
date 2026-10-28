import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Chip, Grid, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import DetailHeader from '../../components/detail/DetailHeader';
import DetailPageState, { isNotFoundError } from '../../components/detail/DetailPageState';
import { useCurrencySymbol } from '../../lib/useCurrencySymbol';
import { sourceLabel } from './CoinTransactionsTable/columns';
import { ExpirySection, MemberSection, OriginSection, TransactionSection } from './detail/CoinTxnSections';
import { COIN_CURRENCY, COIN_TRANSACTION, coinCount, type CoinTxnDetail } from './queries';

/**
 * Loyalty > Duncit Coin > Transactions > one row — everything the ledger knows
 * about it: the coins and the balance they left, whose balance and why, the
 * payment, pods, referral, gift card, backout or rating behind it, and when its
 * unspent coins lapse. Mounted in the Logs console too, beside the ledger.
 */
export default function CoinTransactionDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const currencySymbol = useCurrencySymbol(COIN_CURRENCY);
  const { data, loading, error, refetch } = useQuery<{ coinTransaction: CoinTxnDetail | null }>(COIN_TRANSACTION, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const txn = data?.coinTransaction;
  const credit = txn?.type === 'CREDIT';

  return (
    <DetailPageState
      loading={loading && !txn}
      error={error}
      notFound={isNotFoundError(error) || (!loading && !error && !txn)}
      onRetry={() => refetch()}
    >
      {txn && (
        <Stack spacing={2.5}>
          <DetailHeader
            backTo="/duncit-coin/transactions"
            backLabel={t('loyalty.coinTxn.back')}
            title={t('loyalty.coinTxn.title', { vars: { amount: `${credit ? '+' : '-'}${coinCount(txn.amount)}` } })}
            subtitle={sourceLabel(t).get(txn.source) ?? txn.source}
            status={
              <Chip
                size="small"
                variant="outlined"
                color={credit ? 'success' : 'warning'}
                label={credit ? t('finance.duncitCoin.earned') : t('finance.duncitCoin.redeemed')}
                sx={{ fontWeight: 800 }}
              />
            }
          />
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={2.5}>
                <TransactionSection txn={txn} />
                <OriginSection txn={txn} currencySymbol={currencySymbol} />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack spacing={2.5}>
                <MemberSection txn={txn} />
                <ExpirySection txn={txn} />
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      )}
    </DetailPageState>
  );
}
