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
import { useTranslation } from '@duncit/app-settings';

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
type Translate = ReturnType<typeof useTranslation>['t'];

const typeOptions = (t: Translate) => [
  { value: 'CREDIT', label: t('finance.duncitCoin.earned') },
  { value: 'DEBIT', label: t('finance.duncitCoin.redeemed') },
];

/**
 * WHY the coins moved, which the CREDIT/DEBIT type alone cannot say: a backout
 * refund and a purchase reward are both credits, and reading a returned
 * redemption as "Earned" overstates what the platform gave away.
 */
const sourceOptions = (t: Translate) => [
  { value: 'PAYMENT_EARN', label: t('finance.duncitCoin.purchaseReward') },
  { value: 'PAYMENT_REDEEM', label: t('finance.duncitCoin.spentAtCheckout') },
  { value: 'PAYMENT_REFUND', label: t('finance.duncitCoin.backoutRefund') },
  { value: 'REFERRAL_EARN', label: t('finance.duncitCoin.referralReferrer') },
  { value: 'REFERRAL_SIGNUP', label: t('finance.duncitCoin.referralNewMember') },
  { value: 'GIFT_CARD_REDEEM', label: t('finance.duncitCoin.giftCard') },
  { value: 'POD_FEEDBACK', label: t('finance.duncitCoin.podFeedback') },
  { value: 'ADMIN_GRANT', label: t('finance.duncitCoin.adminGrant') },
  { value: 'ADMIN_DEDUCT', label: t('finance.duncitCoin.adminDeduction') },
];

const sourceLabel = (t: Translate) =>
  new Map(sourceOptions(t).map((option) => [option.value, option.label]));

const isCredit = (row: CoinTxnRow) => row.type === 'CREDIT';

const renderType = (row: CoinTxnRow, t: Translate) => (
  <Chip
    size="small"
    label={isCredit(row) ? t('finance.duncitCoin.earned') : t('finance.duncitCoin.redeemed')}
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
    <Typography variant="caption" noWrap sx={{
      color: "text.secondary"
    }}>
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
    <Typography variant="caption" noWrap sx={{
      color: "text.secondary"
    }}>
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
  t: Translate,
  symbol: string,
  formatDateTime: DateFormatter['formatDateTime']
): DuncitColumn<CoinTxnRow>[] => [
  // `hide` defaults to true — for a ledger the timestamp is the primary column,
  // not a secondary audit field. `formatDate` carries the admin-configured
  // format and, unlike the built-in default, keeps the time: two coin rows four
  // hours apart must not read as the same moment (rule 11).
  dateColumn<CoinTxnRow>({
    field: 'created_at',
    headerName: t('finance.common.when'),
    minWidth: 190,
    hide: false,
    formatDate: formatDateTime,
  }),
  {
    field: 'user_name',
    headerName: t('finance.duncitCoin.user'),
    sortable: false,
    flex: 1,
    minWidth: 190,
    cellRenderer: renderUser,
    valueGetter: (row) => row.user_name || row.user_id,
  },
  {
    field: 'pods',
    headerName: t('finance.common.pod'),
    sortable: false,
    flex: 1,
    minWidth: 190,
    cellRenderer: renderPod,
    valueGetter: (row) => row.pods[0]?.title ?? EM_DASH,
  },
  {
    field: 'type',
    headerName: t('shell.common.type'),
    minWidth: 130,
    filter: { type: 'select', options: typeOptions(t) },
    cellRenderer: (row: CoinTxnRow) => renderType(row, t),
    valueGetter: (row) => row.type,
  },
  {
    field: 'source',
    headerName: t('finance.duncitCoin.source'),
    minWidth: 170,
    filter: { type: 'select', options: sourceOptions(t) },
    valueGetter: (row) => sourceLabel(t).get(row.source) ?? row.source,
  },
  {
    field: 'amount',
    headerName: t('finance.duncitCoin.coins'),
    minWidth: 110,
    filter: { type: 'number' },
    valueGetter: amountValue,
  },
  { field: 'balance_after', headerName: t('finance.duncitCoin.balanceAfter'), minWidth: 140, valueGetter: (row) => coinCount(row.balance_after) },
  {
    field: 'payment_total',
    headerName: t('finance.duncitCoin.orderTotal'),
    sortable: false,
    minWidth: 130,
    valueGetter: (row) => formatMoney(row.payment_total, { symbol }),
  },
  {
    field: 'payment_id',
    headerName: t('finance.common.payment'),
    sortable: false,
    minWidth: 160,
    valueGetter: (row) => row.payment_id ?? EM_DASH,
  },
  {
    field: 'reason',
    headerName: t('finance.common.reason'),
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
  const { t } = useTranslation();
  // Memoised: DuncitTable rebuilds its AG Grid column defs whenever this array
  // changes identity, which would drop the admin's column widths every render.
  const columns = useMemo(
    () => buildColumns(t, currencySymbol, formatDateTime),
    [t, currencySymbol, formatDateTime],
  );

  return (
    <DuncitTable<CoinTxnRow>
      tableId="admin-coin-transactions"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getCoinRowId}
      externalFilters={[{ field: 'pod_doc_id', op: 'eq', value: podId }]}
      emptyText={t('finance.duncitCoin.noCoinActivityYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder="Search payment id or reason"
    />
  );
}
