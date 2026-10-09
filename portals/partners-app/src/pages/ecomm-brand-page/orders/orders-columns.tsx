import type { DuncitColumn } from '@duncit/table';
import { formatDate } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { ALL_FULFILMENT_STATUSES, fulfilmentLabel, statusLabel } from '@duncit/utils';
import type { Translate } from '../brand-wizard/wizard-steps';
import { ORDER_STATUS_COLORS, orderItemsSummary, orderTotal } from './order-labels';
import type { OrderRow } from './orders.queries';

export const getOrderRowId = (row: OrderRow) => row.id;

const METHODS = ['SHIP', 'PICKUP'] as const;

/** The orders table: who bought what, for how much, how it travels and where it stands. */
export const buildOrderColumns = (t: Translate): DuncitColumn<OrderRow>[] => [
  { field: 'order_no', headerName: t('partners.orders.colOrder'), type: 'text', width: 160 },
  { field: 'buyer_name', headerName: t('partners.orders.colBuyer'), type: 'text', minWidth: 160 },
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
  { field: 'total', headerName: t('partners.orders.colTotal'), type: 'number', width: 120, valueGetter: orderTotal },
  {
    field: 'fulfilment_method',
    headerName: t('partners.orders.colMethod'),
    type: 'enum',
    width: 150,
    options: METHODS.map((value) => ({ value, label: fulfilmentLabel(value, t) })),
    valueGetter: (row) => fulfilmentLabel(row.fulfilment_method, t),
  },
  {
    field: 'fulfilment_status',
    headerName: t('shell.common.status'),
    type: 'enum',
    width: 180,
    options: ALL_FULFILMENT_STATUSES.map((value) => ({ value, label: statusLabel(value, t) })),
    cellRenderer: (row) => (
      <StatusChip status={row.fulfilment_status} colorMap={ORDER_STATUS_COLORS} label={statusLabel(row.fulfilment_status, t)} />
    ),
    valueGetter: (row) => statusLabel(row.fulfilment_status, t),
  },
  {
    field: 'awb',
    headerName: t('partners.orders.colAwb'),
    type: 'text',
    width: 150,
    valueGetter: (row) => row.shiprocket.awb || '—',
  },
  {
    field: 'created_at',
    headerName: t('shell.common.created'),
    type: 'date',
    width: 140,
    valueGetter: (row) => formatDate(row.created_at) || '—',
  },
];
