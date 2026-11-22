import { EM_DASH, LabeledIds, dateColumn, labeledIdsText, type DuncitColumn, type LabeledId } from '@duncit/table';
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

type PaymentIdFields = Pick<UserPaymentRow, 'payment_id' | 'invoice_no' | 'razorpay_payment_id' | 'razorpay_order_id' | 'razorpay_refund_ids'>;

/**
 * Every id of the payment under its own name — Razorpay's (what its dashboard
 * shows) first, then Duncit's own reference and the invoice, so nobody reads our
 * reference as a Razorpay payment id.
 */
const paymentIds = (t: Translate, row: PaymentIdFields): LabeledId[] => [
  { label: t('admin.userFinance.idRazorpayPayment'), value: row.razorpay_payment_id },
  { label: t('admin.userFinance.idRazorpayOrder'), value: row.razorpay_order_id },
  { label: t('admin.userFinance.idRazorpayRefund'), value: (row.razorpay_refund_ids ?? []).join(', ') },
  { label: t('admin.userFinance.idDuncitRef'), value: row.payment_id },
  { label: t('admin.userFinance.idInvoice'), value: row.invoice_no },
];

const coins = (value: number | null) => (value ? String(value) : EM_DASH);

const paymentIdColumn = (t: Translate) => ({
  field: 'payment_id',
  headerName: t('admin.userFinance.colIds'),
  type: 'text' as const,
  minWidth: 260,
  cellRenderer: (row: PaymentIdFields) => <LabeledIds ids={paymentIds(t, row)} />,
  valueGetter: (row: PaymentIdFields) => labeledIdsText(paymentIds(t, row)),
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
