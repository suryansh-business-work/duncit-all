import { Stack, Typography } from '@mui/material';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import type { DateFormatter, useTranslation } from '@duncit/app-settings';
import type { PodShopReturnRow, ReturnStatus } from './queries';
import { RETURN_STATUS_KEY } from './labels';

type Translate = ReturnType<typeof useTranslation>['t'];

export const RETURN_STATUS_COLORS: StatusColorMap = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  PICKUP_SCHEDULED: 'info',
  RECEIVED: 'primary',
  REFUNDED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
};

export const returnItemsText = (row: PodShopReturnRow) =>
  row.items.map((i) => `${i.name}${i.variant_label ? ` (${i.variant_label})` : ''} × ${i.qty}`).join(', ');

export const returnColumns = (t: Translate, formatDateTime: DateFormatter['formatDateTime']): DuncitColumn<PodShopReturnRow>[] => [
  {
    field: 'return_no',
    headerName: t('products.returns.colReturn'),
    type: 'text',
    minWidth: 170,
    cellRenderer: (row) => (
      <Stack component="span" sx={{ lineHeight: 1.2, minWidth: 0 }}>
        <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
          {row.return_no}
        </Typography>
        <Typography variant="caption" component="span" noWrap sx={{ color: 'text.secondary' }}>
          {row.order_no}
        </Typography>
      </Stack>
    ),
  },
  { field: 'buyer_name', headerName: t('products.returns.colBuyer'), type: 'text', minWidth: 160 },
  {
    field: 'items',
    headerName: t('products.returns.colItems'),
    type: 'text',
    minWidth: 220,
    sortable: false,
    filterable: false,
    valueGetter: returnItemsText,
  },
  {
    field: 'status',
    headerName: t('products.returns.colStatus'),
    type: 'enum',
    options: (Object.keys(RETURN_STATUS_KEY) as ReturnStatus[]).map((s) => ({ value: s, label: t(RETURN_STATUS_KEY[s]) })),
    width: 170,
    cellRenderer: (row) => (
      <StatusChip status={row.status} label={t(RETURN_STATUS_KEY[row.status])} colorMap={RETURN_STATUS_COLORS} />
    ),
  },
  { field: 'gross', headerName: t('products.returns.colValue'), type: 'number', width: 120, valueGetter: (row) => formatMoney(row.gross, { decimals: 2 }) },
  {
    field: 'pickup',
    headerName: t('products.returns.colPickup'),
    type: 'text',
    minWidth: 170,
    sortable: false,
    filterable: false,
    valueGetter: (row) => (row.pickup.awb ? `${row.pickup.courier_name} · ${row.pickup.awb}` : row.pickup.last_error || EM_DASH),
  },
  {
    field: 'created_at',
    headerName: t('products.returns.colRaised'),
    type: 'date',
    width: 170,
    valueGetter: (row) => (row.created_at ? formatDateTime(row.created_at) : EM_DASH),
  },
];
