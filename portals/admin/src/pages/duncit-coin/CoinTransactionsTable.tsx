import { useMemo } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import {
  DuncitTable,
  EM_DASH,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import type { DateFormatter } from '@duncit/app-settings';
import { coinCount, type CoinTxnRow } from './queries';

interface Props {
  fetchRows: TableFetch<CoinTxnRow>;
  currencySymbol: string;
  formatDateTime: DateFormatter['formatDateTime'];
  /** The pod the page is scoped to, '' for all. Routed through the table's
   * external-filter channel so a change resets to page 1 and refetches; the
   * server does the real scoping from the `pod_doc_id` variable and drops this
   * unknown filter field. */
  podId: string;
}

const getCoinRowId = (row: CoinTxnRow) => row.id;

/** Ledger wording: the stored type, labelled the way the money actually moved. */
const TYPE_OPTIONS = [
  { value: 'CREDIT', label: 'Earned' },
  { value: 'DEBIT', label: 'Redeemed' },
];

const isCredit = (row: CoinTxnRow) => row.type === 'CREDIT';

const renderType = (row: CoinTxnRow) => (
  <Chip
    size="small"
    label={isCredit(row) ? 'Earned' : 'Redeemed'}
    color={isCredit(row) ? 'success' : 'warning'}
    variant="outlined"
    sx={{ fontWeight: 800 }}
  />
);

const renderUser = (row: CoinTxnRow) => (
  <Stack sx={{ minWidth: 0 }}>
    <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
      {row.user_name || row.user_id}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap>
      {row.user_email || EM_DASH}
    </Typography>
  </Stack>
);

/** A shop cart can span pods, so the extra ones are counted rather than hidden. */
const podCaption = (row: CoinTxnRow) => {
  const [first, ...rest] = row.pods;
  if (!first) return 'Not linked to a pod';
  return rest.length > 0 ? `${first.slug} +${rest.length} more` : first.slug;
};

const renderPod = (row: CoinTxnRow) => (
  <Stack sx={{ minWidth: 0 }}>
    <Typography variant="body2" noWrap>
      {row.pods[0]?.title || EM_DASH}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap>
      {podCaption(row)}
    </Typography>
  </Stack>
);

/** Signed so a ledger scan reads as a running story rather than two same-looking columns. */
const amountValue = (row: CoinTxnRow) =>
  `${isCredit(row) ? '+' : '-'}${coinCount(row.amount)}`;

/**
 * `sortable: false` on the joined columns is deliberate: user, pod and the
 * payment total are resolved after the page is fetched, so they are not in the
 * server's sort allowlist. Leaving them sortable would offer a sort the engine
 * silently drops.
 */
const buildColumns = (
  symbol: string,
  formatDateTime: DateFormatter['formatDateTime']
): DuncitColumn<CoinTxnRow>[] => [
  // `hide` defaults to true — for a ledger the timestamp is the primary column,
  // not a secondary audit field. `formatDate` carries the admin-configured
  // format and, unlike the built-in default, keeps the time: two coin rows four
  // hours apart must not read as the same moment (rule 11).
  dateColumn<CoinTxnRow>({
    field: 'created_at',
    headerName: 'When',
    minWidth: 190,
    hide: false,
    formatDate: formatDateTime,
  }),
  {
    field: 'user_name',
    headerName: 'User',
    sortable: false,
    flex: 1,
    minWidth: 190,
    cellRenderer: renderUser,
    valueGetter: (row) => row.user_name || row.user_id,
  },
  {
    field: 'pods',
    headerName: 'Pod',
    sortable: false,
    flex: 1,
    minWidth: 190,
    cellRenderer: renderPod,
    valueGetter: (row) => row.pods[0]?.title ?? EM_DASH,
  },
  {
    field: 'type',
    headerName: 'Type',
    minWidth: 130,
    filter: { type: 'select', options: TYPE_OPTIONS },
    cellRenderer: renderType,
    valueGetter: (row) => row.type,
  },
  {
    field: 'amount',
    headerName: 'Coins',
    minWidth: 110,
    filter: { type: 'number' },
    valueGetter: amountValue,
  },
  { field: 'balance_after', headerName: 'Balance After', minWidth: 140, valueGetter: (row) => coinCount(row.balance_after) },
  {
    field: 'payment_total',
    headerName: 'Order Total',
    sortable: false,
    minWidth: 130,
    valueGetter: (row) => formatMoney(row.payment_total, { symbol }),
  },
  {
    field: 'payment_id',
    headerName: 'Payment',
    sortable: false,
    minWidth: 160,
    valueGetter: (row) => row.payment_id ?? EM_DASH,
  },
  {
    field: 'reason',
    headerName: 'Reason',
    sortable: false,
    flex: 1,
    minWidth: 200,
    valueGetter: (row) => row.reason || EM_DASH,
  },
];

export default function CoinTransactionsTable({
  fetchRows,
  currencySymbol,
  formatDateTime,
  podId,
}: Readonly<Props>) {
  // Memoised: DuncitTable rebuilds its AG Grid column defs whenever this array
  // changes identity, which would drop the admin's column widths every render.
  const columns = useMemo(
    () => buildColumns(currencySymbol, formatDateTime),
    [currencySymbol, formatDateTime],
  );

  return (
    <DuncitTable<CoinTxnRow>
      tableId="admin-coin-transactions"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getCoinRowId}
      externalFilters={[{ field: 'pod_doc_id', op: 'eq', value: podId }]}
      emptyText="No coin activity yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder="Search payment id or reason"
    />
  );
}
