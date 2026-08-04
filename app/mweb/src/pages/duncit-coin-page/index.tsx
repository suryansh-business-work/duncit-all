import { useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import CoinBalanceCard from './CoinBalanceCard';
import CoinHistoryList from './CoinHistoryList';
import { MY_COIN_TRANSACTIONS, type CoinBalance, type CoinTransaction } from './queries';
import { PUBLIC_FINANCE } from '../checkout-page/queries';
import { useTranslation } from '../../i18n/useTranslation';

/** Duncit Coin — the consumer's loyalty balance and its full ledger. Coins are
 * earned on every successful payment and spent at checkout. */
export default function DuncitCoinPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(MY_COIN_TRANSACTIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: financeData } = useQuery(PUBLIC_FINANCE, { fetchPolicy: 'cache-first' });

  const balance: CoinBalance | null = data?.myCoinBalance ?? null;
  const transactions: CoinTransaction[] = data?.myCoinTransactions ?? [];
  const currencySymbol = financeData?.publicFinanceSettings?.currency_symbol ?? '₹';

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={700}>
          {t('mweb.coin.title')}
        </Typography>

        {error && <Alert severity="error">{t('mweb.coin.loadError')}</Alert>}

        <CoinBalanceCard balance={balance} currencySymbol={currencySymbol} />

        {loading && !data ? (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <CoinHistoryList transactions={transactions} />
        )}
      </Stack>
    </Box>
  );
}
