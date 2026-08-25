import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Chip, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useApolloTableFetch, type TableQueryState } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import GiftCardLogsTable from './GiftCardLogsTable';
import { GIFT_CARD_CURRENCY, GIFT_CARD_TXNS_TABLE, type GiftCardTxnRow } from './queries';

/** Finance > Gift Cards > Logs — the insert-only ledger: every card issued and
 * every conversion of a card's value into Duncit Coins. */
export default function GiftCardLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [total, setTotal] = useState<number | null>(null);
  const { formatDateTime } = useDateFormat();

  // Ledger amounts are rupees; the symbol is admin-configured rather than assumed.
  const { data: currencyData } = useQuery(GIFT_CARD_CURRENCY, { fetchPolicy: 'cache-first' });
  const currencySymbol = currencyData?.publicFinanceSettings?.currency_symbol ?? '₹';

  const fetchTable = useApolloTableFetch<GiftCardTxnRow>(
    client,
    GIFT_CARD_TXNS_TABLE,
    'giftCardTransactionsTable',
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
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <ReceiptLongIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          {t('finance.giftCards.logsTitle')}
        </Typography>
        {total != null && <Chip size="small" label={total} sx={{ ml: 1 }} />}
      </Stack>

      <GiftCardLogsTable
        fetchRows={fetchRows}
        currencySymbol={currencySymbol}
        formatDateTime={formatDateTime}
      />
    </Stack>
  );
}
