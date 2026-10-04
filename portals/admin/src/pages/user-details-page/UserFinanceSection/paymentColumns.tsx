import { Stack, Typography } from '@mui/material';
import { EM_DASH, dateColumn, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import type { DateFormatter, useTranslation } from '@duncit/app-settings';
import type { UserPaymentRow, UserRefundRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];
type FormatDateTime = DateFormatter['formatDateTime'];

const STATUS_COLORS: StatusColorMap = { SUCCESS: 'success', PENDING: 'warning', FAILED: 'error', REFUNDED: 'info' };
const STATUS_OPTIONS = ['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map((s) => ({ value: s, label: s }));

const money = (row: { currency_symbol: string }, value: number) =>
  formatMoney(value, { symbol: row.currency_symbol, decimals: 2 });

const renderStatus = (row: { status: string }) => <StatusChip status={row.status} colorMap={STATUS_COLORS} />;

/** The payment id, with its invoice number under it when one was issued. */
const renderPaymentId = (row: { payment_id: string; invoice_no: string | null }) => (
  <Stack component="span" sx={{ lineHeight: 1.2, minWidth: 0 }}>
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
      {row.payment_id}
    </Typography>
    <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
      {row.invoice_no || EM_DASH}
    </Typography>
  </Stack>
);

const coins = (value: number | null) => (value ? String(value) : EM_DASH);

const paymentIdColumn = (t: Translate) => ({
  field: 'payment_id',
  headerName: t('admin.userFinance.colPaymentId'),
  type: 'text' as const,
  minWidth: 170,
  cellRenderer: renderPaymentId,
});

const descriptionColumn = (t: Translate) => ({
  field: 'description',
  headerName: t('admin.userFinance.colDescription'),
  type: 'text' as const,
  flex: 1,
  minWidth: 200,
});

/**
 * Only the fields `paymentsTable` allowlists sort or filter; every other column
 * says so, or the engine would silently drop the request.
 */
export const paymentColumns = (t: Translate, formatDateTime: FormatDateTime): DuncitColumn<UserPaymentRow>[] => [
  dateColumn<UserPaymentRow>({
    headerName: t('admin.userFinance.colCreatedAt'),
    hide: false,
    width: 170,
    formatDate: formatDateTime,
  }),
  paymentIdColumn(t),
  descriptionColumn(t),
  {
    field: 'total',
    headerName: t('admin.userFinance.colTotal'),
    type: 'number',
    width: 130,
    valueGetter: (row) => money(row, row.total),
  },
  { field: 'status', headerName: t('admin.userFinance.colStatus'), type: 'enum', options: STATUS_OPTIONS, width: 130, cellRenderer: renderStatus },
  {
    field: 'coins_redeemed',
    headerName: t('admin.userFinance.colCoinsRedeemed'),
    type: 'number',
    width: 120,
    valueGetter: (row) => coins(row.coins_redeemed),
  },
  {
    field: 'coins_earned',
    headerName: t('admin.userFinance.colCoinsEarned'),
    type: 'number',
    width: 120,
    filterable: false,
    valueGetter: (row) => coins(row.coins_earned),
  },
  { field: 'gateway', headerName: t('admin.userFinance.colGateway'), type: 'text', width: 120, sortable: false, hide: true },
  dateColumn<UserPaymentRow>({
    field: 'paid_at',
    headerName: t('admin.userFinance.colPaidAt'),
    width: 170,
    formatDate: formatDateTime,
  }),
];

/** `refund_amount` falls back to the payment total server-side, so it has no stored path to sort or filter on. */
export const refundColumns = (t: Translate, formatDateTime: FormatDateTime): DuncitColumn<UserRefundRow>[] => [
  dateColumn<UserRefundRow>({
    field: 'refunded_at',
    headerName: t('admin.userFinance.colRefundedAt'),
    hide: false,
    width: 170,
    filterable: false,
    formatDate: formatDateTime,
  }),
  paymentIdColumn(t),
  descriptionColumn(t),
  {
    field: 'refund_amount',
    headerName: t('admin.userFinance.colRefundAmount'),
    type: 'number',
    width: 130,
    sortable: false,
    filterable: false,
    valueGetter: (row) => money(row, row.refund_amount),
  },
  {
    field: 'total',
    headerName: t('admin.userFinance.colTotal'),
    type: 'number',
    width: 130,
    valueGetter: (row) => money(row, row.total),
  },
  {
    field: 'partial',
    headerName: t('admin.userFinance.colPartial'),
    type: 'text',
    width: 110,
    filterable: false,
    valueGetter: (row) => (row.partial ? t('admin.userFinance.yes') : t('admin.userFinance.no')),
  },
  { field: 'status', headerName: t('admin.userFinance.colStatus'), type: 'enum', options: STATUS_OPTIONS, width: 130, cellRenderer: renderStatus },
  {
    field: 'refund_reason',
    headerName: t('admin.userFinance.colRefundReason'),
    type: 'text',
    flex: 1,
    minWidth: 180,
    valueGetter: (row) => row.refund_reason || EM_DASH,
  },
  {
    field: 'refund_initiated_by',
    headerName: t('admin.userFinance.colRefundBy'),
    type: 'text',
    width: 150,
    valueGetter: (row) => row.refund_initiated_by || EM_DASH,
  },
];
