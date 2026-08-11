import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Chip, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useSearchParams } from 'react-router-dom';
import { useApolloTableFetch, type TableQueryState } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import CoinTransactionsTable from './CoinTransactionsTable';
import PodPicker from './PodPicker';
import { COIN_CURRENCY, COIN_TRANSACTIONS_TABLE, type CoinTxnRow } from './queries';

/** Admin > Duncit Coin > Transactions — the full coin ledger: which user earned
 * or spent how many coins, on which pod's order. */
export default function CoinTransactionsPage() {
  const client = useApolloClient();
  const [params, setParams] = useSearchParams();
  const podId = params.get('pod_id') ?? '';
  const [total, setTotal] = useState<number | null>(null);
  const { formatDateTime } = useDateFormat();

  // The ledger is counted in coins; only the joined order total is money, and
  // its symbol is admin-configured rather than assumed.
  const { data: currencyData } = useQuery(COIN_CURRENCY, { fetchPolicy: 'cache-first' });
  const currencySymbol = currencyData?.publicFinanceSettings?.currency_symbol ?? '₹';

  const fetchTable = useApolloTableFetch<CoinTxnRow>(
    client,
    COIN_TRANSACTIONS_TABLE,
    'coinTransactionsTable',
    // The pod scope is a top-level arg, not a column filter: `pod_id` is not a
    // field on the ledger row, so the table engine's allowlist would drop it.
    { extraVariables: { pod_doc_id: podId || null } },
    [podId],
  );

  // The table drops out-of-order responses; this counter keeps the header count
  // on the same footing, so a slow earlier search cannot overwrite it.
  const seqRef = useRef(0);
  const fetchRows = useCallback(
    async (query: TableQueryState) => {
      seqRef.current += 1;
      const seq = seqRef.current;
      const page = await fetchTable(query);
      if (seq === seqRef.current) setTotal(page.total);
      return page;
    },
    [fetchTable],
  );

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <ReceiptLongIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Coin Transactions
          </Typography>
          {total != null && <Chip size="small" label={total} sx={{ ml: 1 }} />}
        </Stack>
        <PodPicker
          value={podId}
          onChange={(next) => (next ? setParams({ pod_id: next }) : setParams({}))}
        />
      </Stack>

      <CoinTransactionsTable
        fetchRows={fetchRows}
        podId={podId}
        currencySymbol={currencySymbol}
        formatDateTime={formatDateTime}
      />
    </Stack>
  );
}
