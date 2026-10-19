import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import type { DateFormatter, useTranslation } from '@duncit/app-settings';
import type { DeletionRefundRow } from './refundQueries';

type Translate = ReturnType<typeof useTranslation>['t'];
type Formatter = Pick<DateFormatter, 'formatDate' | 'formatDateTime'>;
type RefundStatus = DeletionRefundRow['refund']['status'];

export const REFUND_STATUS_COLORS: StatusColorMap = {
  NONE: 'default',
  PENDING: 'warning',
  PROCESSED: 'success',
  RECORDED: 'info',
  FAILED: 'error',
};

/** The refund states a filter offers — NONE is the absence of a refund. */
const FILTERABLE: RefundStatus[] = ['PENDING', 'PROCESSED', 'RECORDED', 'FAILED'];

export function refundStatusLabel(status: RefundStatus, t: Translate): string {
  switch (status) {
    case 'PENDING':
      return t('products.deletionRefunds.status.PENDING');
    case 'PROCESSED':
      return t('products.deletionRefunds.status.PROCESSED');
    case 'RECORDED':
      return t('products.deletionRefunds.status.RECORDED');
    case 'FAILED':
      return t('products.deletionRefunds.status.FAILED');
    default:
      return t('products.deletionRefunds.status.NONE');
  }
}

const money = (row: DeletionRefundRow, amount: number) =>
  formatMoney(amount, { decimals: 2, symbol: row.currency_symbol || undefined });

const variantSuffix = (label: DeletionRefundRow['line_items'][number]['variant_label']) => (label ? ` (${label})` : '');

const itemsOf = (row: DeletionRefundRow) =>
  row.line_items.map((line) => `${line.name}${variantSuffix(line.variant_label)} × ${line.qty}`).join(', ');

/**
 * One cancelled order per row. Every cell has a `valueGetter`, so the CSV the
 * table downloads reads exactly what the grid shows — the list Finance and the
 * Products team reconcile refunds against.
 */
export const refundColumns = (t: Translate, f: Formatter): DuncitColumn<DeletionRefundRow>[] => [
  { field: 'order_no', headerName: t('products.deletionRefunds.colOrder'), type: 'text', width: 160 },
  {
    field: 'deletion_request_no',
    headerName: t('products.deletionRefunds.colRequest'),
    type: 'text',
    width: 150,
    valueGetter: (row) => row.deletion_request_no || EM_DASH,
  },
  { field: 'buyer_name', headerName: t('products.deletionRefunds.colBuyer'), type: 'text', minWidth: 160 },
  { field: 'buyer_email', headerName: t('products.deletionRefunds.colBuyerEmail'), type: 'text', minWidth: 200, hide: true },
  {
    field: 'brand_name',
    headerName: t('products.deletionRequests.colBrand'),
    type: 'text',
    minWidth: 140,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.brand_name || EM_DASH,
  },
  {
    field: 'line_items',
    headerName: t('products.deletionRefunds.colItems'),
    type: 'text',
    flex: 1,
    minWidth: 220,
    sortable: false,
    filterable: false,
    valueGetter: itemsOf,
  },
  {
    field: 'total',
    headerName: t('products.deletionRefunds.colOrderTotal'),
    type: 'number',
    width: 130,
    valueGetter: (row) => money(row, row.total),
  },
  {
    field: 'refund_status',
    headerName: t('products.deletionRefunds.colRefundStatus'),
    type: 'enum',
    width: 230,
    options: FILTERABLE.map((value) => ({ value, label: refundStatusLabel(value, t) })),
    cellRenderer: (row) => (
      <StatusChip status={row.refund.status} label={refundStatusLabel(row.refund.status, t)} colorMap={REFUND_STATUS_COLORS} />
    ),
    valueGetter: (row) => refundStatusLabel(row.refund.status, t),
  },
  {
    field: 'refund_amount',
    headerName: t('products.deletionRefunds.colRefundAmount'),
    type: 'number',
    width: 160,
    valueGetter: (row) => money(row, row.refund.amount),
  },
  {
    field: 'refund_coins',
    headerName: t('products.deletionRefunds.colRefundCoins'),
    type: 'number',
    width: 140,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.refund.coins,
  },
  {
    field: 'cancelled_at',
    headerName: t('products.deletionRefunds.colCancelledOn'),
    type: 'date',
    width: 150,
    valueGetter: (row) => (row.cancelled_at ? f.formatDate(row.cancelled_at) : EM_DASH),
  },
  {
    field: 'refunded_at',
    headerName: t('products.deletionRefunds.colRefundedOn'),
    type: 'date',
    width: 180,
    filterable: false,
    valueGetter: (row) => (row.refund.refunded_at ? f.formatDateTime(row.refund.refunded_at) : EM_DASH),
  },
  {
    field: 'razorpay_refund_id',
    headerName: t('products.deletionRefunds.colRefundRef'),
    type: 'text',
    width: 190,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.refund.razorpay_refund_id || EM_DASH,
  },
  {
    field: 'refund_error',
    headerName: t('products.deletionRefunds.colProblem'),
    type: 'text',
    minWidth: 240,
    hide: true,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.refund.error || EM_DASH,
  },
];
