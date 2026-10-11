import type { DuncitColumn } from '@duncit/table';
import { formatDate, formatDateTime } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import type { Translate } from '../brand-wizard/wizard-steps';
import {
  REFUND_STATUS_COLORS, REFUND_STATUSES, orderItemsSummary, orderTotal, refundAmount, refundStatusLabel,
} from '../orders/order-labels';
import type { OrderRow } from '../orders/orders.queries';

const DASH = '—';

/**
 * One cancelled order per row: who is refunded, what goes back and where it
 * stands. Every cell has a `valueGetter`, so the table's CSV download reads
 * exactly what the grid shows.
 */
export const buildRefundColumns = (t: Translate): DuncitColumn<OrderRow>[] => [
  { field: 'order_no', headerName: t('partners.orders.colOrder'), type: 'text', width: 160 },
  {
    field: 'deletion_request_no',
    headerName: t('partners.deletionRefunds.colRequest'),
    type: 'text',
    width: 160,
    valueGetter: (row) => row.deletion_request_no || DASH,
  },
  { field: 'buyer_name', headerName: t('partners.orders.colBuyer'), type: 'text', minWidth: 160 },
  {
    field: 'brand_name',
    headerName: t('partners.deletionRefunds.colBrand'),
    type: 'text',
    minWidth: 140,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.brand_name || DASH,
  },
  {
    field: 'line_items',
    headerName: t('partners.orders.colItems'),
    type: 'text',
    flex: 1,
    minWidth: 200,
    sortable: false,
    filterable: false,
    valueGetter: (row) => orderItemsSummary(t, row),
  },
  { field: 'total', headerName: t('partners.deletionRefunds.colOrderTotal'), type: 'number', width: 130, valueGetter: orderTotal },
  {
    field: 'refund_status',
    headerName: t('partners.deletionRefunds.colRefundStatus'),
    type: 'enum',
    width: 220,
    options: REFUND_STATUSES.map((value) => ({ value, label: refundStatusLabel(value, t) })),
    cellRenderer: (row) => (
      <StatusChip status={row.refund.status} colorMap={REFUND_STATUS_COLORS} label={refundStatusLabel(row.refund.status, t)} />
    ),
    valueGetter: (row) => refundStatusLabel(row.refund.status, t),
  },
  {
    field: 'refund_amount',
    headerName: t('partners.deletionRefunds.colRefundAmount'),
    type: 'number',
    width: 160,
    valueGetter: refundAmount,
  },
  {
    field: 'refund_coins',
    headerName: t('partners.deletionRefunds.colRefundCoins'),
    type: 'number',
    width: 140,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.refund.coins,
  },
  {
    field: 'cancelled_at',
    headerName: t('partners.deletionRefunds.colCancelledOn'),
    type: 'date',
    width: 150,
    valueGetter: (row) => (row.cancelled_at ? formatDate(row.cancelled_at) : DASH),
  },
  {
    field: 'refunded_at',
    headerName: t('partners.deletionRefunds.colRefundedOn'),
    type: 'date',
    width: 180,
    filterable: false,
    valueGetter: (row) => (row.refund.refunded_at ? formatDateTime(row.refund.refunded_at) : DASH),
  },
  {
    field: 'razorpay_refund_id',
    headerName: t('partners.deletionRefunds.colRefundRef'),
    type: 'text',
    width: 190,
    hide: true,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.refund.razorpay_refund_id || DASH,
  },
  {
    field: 'refund_error',
    headerName: t('partners.deletionRefunds.colProblem'),
    type: 'text',
    minWidth: 220,
    hide: true,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.refund.error || DASH,
  },
];
