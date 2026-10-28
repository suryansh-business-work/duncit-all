import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import TablePageHeader from '../../../components/TablePageHeader';
import { useCountedFetch } from '../../../lib/useCountedFetch';
import { useCurrencySymbol } from '../../../lib/useCurrencySymbol';
import GiftCardLogsTable from './GiftCardLogsTable';
import { GIFT_CARD_CURRENCY, GIFT_CARD_TXNS_TABLE, type GiftCardTxnRow } from './queries';

/** Loyalty > Virtual Gift Cards > Logs — the insert-only ledger: every card
 * issued and every conversion of a card's value into Duncit Coins. A row opens
 * its card when the console has a card page (cardPath); the Logs console
 * mounts this page without one. */
export default function GiftCardLogsPage({ cardPath }: Readonly<{ cardPath?: (id: string) => string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat();
  const currencySymbol = useCurrencySymbol(GIFT_CARD_CURRENCY);
  const fetchTable = useApolloTableFetch<GiftCardTxnRow>(client, GIFT_CARD_TXNS_TABLE, 'giftCardTransactionsTable');
  const { total, fetchRows } = useCountedFetch(fetchTable);

  return (
    <Stack spacing={2.5}>
      <TablePageHeader
        icon={<ReceiptLongIcon color="primary" />}
        title={t('finance.giftCards.logsTitle')}
        total={total}
      />
      <GiftCardLogsTable
        fetchRows={fetchRows}
        currencySymbol={currencySymbol}
        formatDateTime={formatDateTime}
        onRowClick={cardPath ? (row) => navigate(cardPath(row.gift_card_id)) : undefined}
      />
    </Stack>
  );
}
