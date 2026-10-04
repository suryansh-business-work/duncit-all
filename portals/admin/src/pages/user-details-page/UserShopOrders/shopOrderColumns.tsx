import { Stack, Typography } from '@mui/material';
import { EM_DASH, dateColumn, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import type { DateFormatter, useTranslation } from '@duncit/app-settings';
import type { UserShopOrderRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];
type FormatDateTime = DateFormatter['formatDateTime'];

const STATUSES = [
  'PENDING',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'PICKUP_SCHEDULED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'CANCELLED',
  'RTO',
  'RTO_DELIVERED',
  'NDR',
  'LOST',
  'FAILED',
];
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }));
const STATUS_COLORS: StatusColorMap = {
  DELIVERED: 'success',
  PICKED_UP: 'success',
  CANCELLED: 'error',
  FAILED: 'error',
  LOST: 'error',
  NDR: 'warning',
  RTO: 'warning',
};
const REFUND_COLORS: StatusColorMap = { PROCESSED: 'success', RECORDED: 'info', PENDING: 'warning', FAILED: 'error' };

const money = (row: UserShopOrderRow, value: number) => formatMoney(value, { symbol: row.currency_symbol, decimals: 2 });

const itemsText = (row: UserShopOrderRow) =>
  row.line_items.map((l) => `${l.name}${l.variant_label ? ` (${l.variant_label})` : ''} × ${l.qty}`).join(', ');

/** The order number, with the pod it was bought at under it. */
const renderOrder = (row: UserShopOrderRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2, minWidth: 0 }}>
    <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
      {row.order_no}
    </Typography>
    <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
      {row.pod?.pod_title || EM_DASH}
    </Typography>
  </Stack>
);

/** Only the fields userProductOrdersTable allowlists sort or filter; the rest say so. */
export const shopOrderColumns = (t: Translate, formatDateTime: FormatDateTime): DuncitColumn<UserShopOrderRow>[] => [
  dateColumn<UserShopOrderRow>({
    headerName: t('admin.userShopOrders.colPlaced'),
    hide: false,
    width: 170,
    formatDate: formatDateTime,
  }),
  { field: 'order_no', headerName: t('admin.userShopOrders.colOrder'), type: 'text', minWidth: 190, cellRenderer: renderOrder },
  {
    field: 'line_items',
    headerName: t('admin.userShopOrders.colItems'),
    type: 'text',
    minWidth: 240,
    sortable: false,
    filterable: false,
    valueGetter: itemsText,
  },
  { field: 'total', headerName: t('admin.userShopOrders.colTotal'), type: 'number', width: 120, valueGetter: (row) => money(row, row.total) },
  {
    field: 'fulfilment_status',
    headerName: t('admin.userShopOrders.colStatus'),
    type: 'enum',
    options: STATUS_OPTIONS,
    width: 170,
    cellRenderer: (row) => <StatusChip status={row.fulfilment_status} colorMap={STATUS_COLORS} />,
  },
  {
    field: 'delivered_at',
    headerName: t('admin.userShopOrders.colDelivered'),
    type: 'text',
    width: 170,
    sortable: false,
    filterable: false,
    valueGetter: (row) => (row.delivered_at ? formatDateTime(row.delivered_at) : EM_DASH),
  },
  {
    field: 'refund',
    headerName: t('admin.userShopOrders.colRefund'),
    type: 'text',
    width: 170,
    sortable: false,
    filterable: false,
    cellRenderer: (row) =>
      row.refund.status === 'NONE' ? (
        EM_DASH
      ) : (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <StatusChip status={row.refund.status} colorMap={REFUND_COLORS} />
          <Typography variant="caption" component="span">
            {money(row, row.refund.amount)}
          </Typography>
        </Stack>
      ),
  },
  {
    field: 'cancel_reason',
    headerName: t('admin.userShopOrders.colCancelReason'),
    type: 'text',
    minWidth: 200,
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.cancel_reason || EM_DASH,
  },
];
