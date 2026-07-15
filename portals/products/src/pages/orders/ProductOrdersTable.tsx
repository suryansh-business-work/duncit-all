import { useMemo, type MutableRefObject } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { ALL_STATUSES, STATUS_COLOR, humaniseStatus, type FulfilmentStatus } from './constants';
import { useDateFormat } from '../../utils/dateFormat';
import type { ProductOrderRow } from './queries';

interface Props {
  fetchRows: TableFetch<ProductOrderRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onView: (o: ProductOrderRow) => void;
}

const METHOD_OPTIONS = [
  { value: 'SHIP', label: 'SHIP' },
  { value: 'PICKUP', label: 'PICKUP' },
];

const STATUS_OPTIONS = ALL_STATUSES.map((value) => ({ value, label: humaniseStatus(value) }));

const getRowId = (o: ProductOrderRow) => o.id;

const renderBuyer = (o: ProductOrderRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span">
      {o.buyer_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {o.buyer_email}
    </Typography>
  </Stack>
);

const renderMethod = (o: ProductOrderRow) => (
  <Chip size="small" variant="outlined" label={o.fulfilment_method} />
);

const renderStatus = (o: ProductOrderRow) => (
  <Chip
    size="small"
    label={humaniseStatus(o.fulfilment_status)}
    color={STATUS_COLOR[o.fulfilment_status as FulfilmentStatus] ?? 'default'}
  />
);

export default function ProductOrdersTable({ fetchRows, refetchRef, onView }: Readonly<Props>) {
  const { formatDateTime } = useDateFormat();
  const columns = useMemo<DuncitColumn<ProductOrderRow>[]>(() => {
    const renderOrder = (o: ProductOrderRow) => (
      <Stack sx={{ lineHeight: 1.2 }} component="span">
        <Typography variant="body2" fontWeight={600} component="span">
          {o.order_no}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="span">
          {formatDateTime(o.created_at)}
        </Typography>
      </Stack>
    );
    return [
      {
        field: 'order_no',
        headerName: 'Order',
        filter: { type: 'text' },
        minWidth: 170,
        cellRenderer: renderOrder,
        valueGetter: (o) => o.order_no,
      },
      {
        field: 'buyer_name',
        headerName: 'Buyer',
        flex: 1,
        minWidth: 180,
        cellRenderer: renderBuyer,
        valueGetter: (o) => o.buyer_name,
      },
      {
        field: 'pod',
        headerName: 'Pod',
        sortable: false,
        minWidth: 160,
        valueGetter: (o) => o.pod?.pod_title ?? '—',
      },
      {
        field: 'fulfilment_method',
        headerName: 'Method',
        filter: { type: 'select', options: METHOD_OPTIONS },
        width: 110,
        cellRenderer: renderMethod,
        valueGetter: (o) => o.fulfilment_method,
      },
      {
        field: 'fulfilment_status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_OPTIONS },
        minWidth: 160,
        cellRenderer: renderStatus,
        valueGetter: (o) => humaniseStatus(o.fulfilment_status),
      },
      {
        field: 'awb',
        headerName: 'AWB',
        width: 140,
        valueGetter: (o) => o.shiprocket?.awb || '—',
      },
      {
        field: 'total',
        headerName: 'Total',
        filter: { type: 'number' },
        width: 110,
        valueGetter: (o) => `${o.currency_symbol}${o.total}`,
      },
      {
        field: 'buyer_email',
        headerName: 'Buyer email',
        filter: { type: 'text' },
        hide: true,
        minWidth: 180,
      },
      {
        field: 'created_at',
        headerName: 'Placed',
        filter: { type: 'date' },
        hide: true,
        width: 150,
        valueGetter: (o) => (o.created_at ? formatDateTime(o.created_at) : '—'),
      },
    ];
  }, [formatDateTime]);

  return (
    <DuncitTable<ProductOrderRow>
      tableId="products-orders"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onView}
      emptyText="No orders match these filters."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search order no, buyer or AWB"
      refetchRef={refetchRef}
    />
  );
}
