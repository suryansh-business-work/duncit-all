import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import CoinBalanceCard from './CoinBalanceCard';
import CoinHistoryList from './CoinHistoryList';
import { MY_COIN_TRANSACTIONS, type CoinBalance, type CoinTransaction } from './queries';
import { PUBLIC_FINANCE } from '../checkout-page/queries';
import { useTranslation } from '../../i18n/useTranslation';

/** Duncit Coin — the consumer's loyalty balance and its full ledger. Coins are
 * earned on every successful payment and spent at checkout. */
export default function DuncitCoinPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(MY_COIN_TRANSACTIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: financeData } = useQuery<any>(PUBLIC_FINANCE, { fetchPolicy: 'cache-first' });

  const balance: CoinBalance | null = data?.myCoinBalance ?? null;
  const transactions: CoinTransaction[] = data?.myCoinTransactions ?? [];
  const currencySymbol = financeData?.publicFinanceSettings?.currency_symbol ?? '₹';

  return (
    <Stack spacing={2.5} sx={{ py: 0.5 }}>
      <PageHeader title={t('mweb.coin.title')} />

      {error && <Alert severity="error">{t('mweb.coin.loadError')}</Alert>}

      <CoinBalanceCard balance={balance} currencySymbol={currencySymbol} />

      {loading && !data ? (
        <Stack
          sx={{
            alignItems: "center",
            py: 3
          }}>
          <CircularProgress size={24} />
        </Stack>
      ) : (
        <CoinHistoryList transactions={transactions} />
      )}
    </Stack>
  );
}
