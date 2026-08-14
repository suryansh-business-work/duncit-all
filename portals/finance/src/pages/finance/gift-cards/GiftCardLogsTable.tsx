import { useMemo } from 'react';
import { Chip } from '@mui/material';
import {
  DuncitTable,
  EM_DASH,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import { renderCode, renderPerson } from './cells';
import type { GiftCardTxnRow } from './queries';

interface Props {
  fetchRows: TableFetch<GiftCardTxnRow>;
  currencySymbol: string;
  formatDateTime: DateFormatter['formatDateTime'];
}

const getTxnRowId = (row: GiftCardTxnRow) => row.id;

const isIssue = (row: GiftCardTxnRow) => row.type === 'ISSUE';

/** The filter's options carry translated labels but untranslated values — the
 * value is the stored type the server filters on, not copy. */
const typeOptions = (t: Translator['t']) => [
  { value: 'ISSUE', label: t('finance.giftCards.typeIssue') },
  { value: 'REDEEM', label: t('finance.giftCards.typeRedeem') },
];

/**
 * `sortable: false` on the user column is deliberate: it is joined after the
 * page is fetched, so it is not in the server's sort allowlist. Leaving it
 * sortable would offer a sort the engine silently drops.
 */
const buildColumns = (
  t: Translator['t'],
  symbol: string,
  formatDateTime: DateFormatter['formatDateTime'],
): DuncitColumn<GiftCardTxnRow>[] => {
  const issueLabel = t('finance.giftCards.typeIssue');
  const redeemLabel = t('finance.giftCards.typeRedeem');
  const renderType = (row: GiftCardTxnRow) => (
    <Chip
      size="small"
      label={isIssue(row) ? issueLabel : redeemLabel}
      color={isIssue(row) ? 'success' : 'warning'}
      variant="outlined"
      sx={{ fontWeight: 800 }}
    />
  );
  return [
    dateColumn<GiftCardTxnRow>({
      field: 'created_at',
      headerName: t('finance.giftCards.colWhen'),
      minWidth: 190,
      hide: false,
      formatDate: formatDateTime,
    }),
    {
      field: 'code',
      headerName: t('finance.giftCards.colCode'),
      minWidth: 180,
      cellRenderer: (row) => renderCode(row.code),
      valueGetter: (row) => row.code,
    },
    {
      field: 'user_name',
      headerName: t('finance.giftCards.colUser'),
      sortable: false,
      flex: 1,
      minWidth: 190,
      cellRenderer: (row) => renderPerson(row.user_name, row.user_email),
      valueGetter: (row) => row.user_name || row.user_id,
    },
    {
      field: 'type',
      headerName: t('finance.giftCards.colType'),
      minWidth: 130,
      filter: { type: 'select', options: typeOptions(t) },
      cellRenderer: renderType,
      valueGetter: (row) => row.type,
    },
    {
      field: 'amount',
      headerName: t('finance.giftCards.colAmount'),
      minWidth: 120,
      filter: { type: 'number' },
      valueGetter: (row) => formatMoney(row.amount, { symbol }),
    },
    {
      field: 'balance_after',
      headerName: t('finance.giftCards.colBalanceAfter'),
      minWidth: 140,
      valueGetter: (row) => formatMoney(row.balance_after, { symbol }),
    },
    {
      // Enum-ish value echoed straight from the database (PURCHASE /
      // REDEEM_TO_COINS) — data, not a sentence, per the bundle's convention.
      field: 'source',
      headerName: t('finance.giftCards.colSource'),
      minWidth: 170,
      filter: { type: 'text' },
      valueGetter: (row) => row.source,
    },
    {
      field: 'payment_id',
      headerName: t('finance.giftCards.colPayment'),
      sortable: false,
      minWidth: 160,
      valueGetter: (row) => row.payment_id ?? EM_DASH,
    },
  ];
};

export default function GiftCardLogsTable({
  fetchRows,
  currencySymbol,
  formatDateTime,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Memoised: DuncitTable rebuilds its AG Grid column defs whenever this array
  // changes identity, which would drop the admin's column widths every render.
  const columns = useMemo(
    () => buildColumns(t, currencySymbol, formatDateTime),
    [t, currencySymbol, formatDateTime],
  );

  return (
    <DuncitTable<GiftCardTxnRow>
      tableId="finance-gift-card-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getTxnRowId}
      emptyText={t('finance.giftCards.logsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder={t('finance.giftCards.logsSearch')}
    />
  );
}
