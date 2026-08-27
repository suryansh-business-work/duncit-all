import { useMemo, type MutableRefObject } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import type { FulfilmentTranslate } from '@duncit/utils';
import { ALL_STATUSES, STATUS_COLOR, humaniseStatus } from './constants';
import { useDateFormat } from '@duncit/app-settings';
import type { ProductOrderRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<ProductOrderRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onView: (o: ProductOrderRow) => void;
}

const METHOD_OPTIONS = [
  { value: 'SHIP', label: 'SHIP' },
  { value: 'PICKUP', label: 'PICKUP' },
];

const getRowId = (o: ProductOrderRow) => o.id;

const renderBuyer = (o: ProductOrderRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span">
      {o.buyer_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
      {o.buyer_email}
    </Typography>
  </Stack>
);

const renderMethod = (o: ProductOrderRow) => (
  <Chip size="small" variant="outlined" label={o.fulfilment_method} />
);

/** Takes the translator rather than closing over one: the labels are localized
 * and this renderer sits at module scope. */
const renderStatus = (o: ProductOrderRow, t: FulfilmentTranslate) => (
  <StatusChip
    status={o.fulfilment_status}
    label={humaniseStatus(o.fulfilment_status, t)}
    colorMap={STATUS_COLOR}
  />
);

export default function ProductOrdersTable({ fetchRows, refetchRef, onView }: Readonly<Props>) {
  const { t } = useTranslation();
  // Built here rather than at module scope: the labels are localized, so they
  // need the reader's translator (rule 38). Memoised so it is a stable
  // dependency of the columns below.
  const statusOptions = useMemo(
    () => ALL_STATUSES.map((value) => ({ value, label: humaniseStatus(value, t) })),
    [t],
  );
  const { formatDateTime } = useDateFormat();
  const columns = useMemo<DuncitColumn<ProductOrderRow>[]>(() => {
    const renderOrder = (o: ProductOrderRow) => (
      <Stack sx={{ lineHeight: 1.2 }} component="span">
        <Typography variant="body2" component="span" sx={{
          fontWeight: 600
        }}>
          {o.order_no}
        </Typography>
        <Typography variant="caption" component="span" sx={{
          color: "text.secondary"
        }}>
          {formatDateTime(o.created_at)}
        </Typography>
      </Stack>
    );
    return [
      {
        field: 'order_no',
        headerName: t('products.orders.colOrder'),
        filter: { type: 'text' },
        minWidth: 170,
        cellRenderer: renderOrder,
        valueGetter: (o) => o.order_no,
      },
      {
        field: 'buyer_name',
        headerName: t('products.orders.colBuyer'),
        flex: 1,
        minWidth: 180,
        cellRenderer: renderBuyer,
        valueGetter: (o) => o.buyer_name,
      },
      {
        field: 'pod',
        headerName: t('products.orders.colPod'),
        sortable: false,
        minWidth: 160,
        valueGetter: (o) => o.pod?.pod_title ?? '—',
      },
      {
        field: 'fulfilment_method',
        headerName: t('products.orders.colMethod'),
        filter: { type: 'select', options: METHOD_OPTIONS },
        width: 110,
        cellRenderer: renderMethod,
        valueGetter: (o) => o.fulfilment_method,
      },
      {
        field: 'fulfilment_status',
        headerName: t('shell.common.status'),
        filter: { type: 'select', options: statusOptions },
        minWidth: 160,
        cellRenderer: (o: ProductOrderRow) => renderStatus(o, t),
        valueGetter: (o) => humaniseStatus(o.fulfilment_status, t),
      },
      {
        field: 'awb',
        headerName: 'AWB',
        width: 140,
        valueGetter: (o) => o.shiprocket?.awb || '—',
      },
      {
        field: 'total',
        headerName: t('products.orders.colTotal'),
        filter: { type: 'number' },
        width: 110,
        valueGetter: (o) => `${o.currency_symbol}${o.total}`,
      },
      {
        field: 'buyer_email',
        headerName: t('products.orders.colBuyerEmail'),
        filter: { type: 'text' },
        hide: true,
        minWidth: 180,
      },
      {
        field: 'created_at',
        headerName: t('products.orders.colPlaced'),
        filter: { type: 'date' },
        hide: true,
        width: 150,
        valueGetter: (o) => (o.created_at ? formatDateTime(o.created_at) : '—'),
      },
    ];
    // `t` and the options built from it belong here: the column headers, the
    // status filter and the status cells are all localized now, so a language
    // change has to rebuild them.
  }, [formatDateTime, t, statusOptions]);

  return (
    <DuncitTable<ProductOrderRow>
      tableId="products-orders"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onView}
      emptyText={t('products.orders.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search order no, buyer or AWB"
      refetchRef={refetchRef}
    />
  );
}
