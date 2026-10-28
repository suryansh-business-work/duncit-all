import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useNavigate, useSearchParams } from 'react-router';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import TablePageHeader from '../../components/TablePageHeader';
import { useCountedFetch } from '../../lib/useCountedFetch';
import { useCurrencySymbol } from '../../lib/useCurrencySymbol';
import CoinTransactionsTable from './CoinTransactionsTable';
import PodPicker from './PodPicker';
import { COIN_CURRENCY, COIN_TRANSACTIONS_TABLE, type CoinTxnRow } from './queries';

/** Loyalty > Duncit Coin > Transactions — the full coin ledger: which user earned
 * or spent how many coins, on which pod's order. */
export default function CoinTransactionsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const podId = params.get('pod_id') ?? '';
  const { formatDateTime } = useDateFormat();

  // The ledger is counted in coins; only the joined order total is money.
  const currencySymbol = useCurrencySymbol(COIN_CURRENCY);

  const fetchTable = useApolloTableFetch<CoinTxnRow>(
    client,
    COIN_TRANSACTIONS_TABLE,
    'coinTransactionsTable',
    // The pod scope is a top-level arg, not a column filter: `pod_id` is not a
    // field on the ledger row, so the table engine's allowlist would drop it.
    { extraVariables: { pod_doc_id: podId || null } },
    [podId],
  );
  const { total, fetchRows } = useCountedFetch(fetchTable);

  return (
    <Stack spacing={2.5}>
      <TablePageHeader
        icon={<ReceiptLongIcon color="primary" />}
        title={t('shell.nav.coinTransactions')}
        total={total}
        actions={
          <PodPicker
            value={podId}
            onChange={(next) => (next ? setParams({ pod_id: next }) : setParams({}))}
          />
        }
      />
      <CoinTransactionsTable
        fetchRows={fetchRows}
        podId={podId}
        currencySymbol={currencySymbol}
        formatDateTime={formatDateTime}
        onRowClick={(row) => navigate(`/duncit-coin/transactions/${row.id}`)}
      />
    </Stack>
  );
}
