import { useMemo } from 'react';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useDateFormat, useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import { renderPerson } from '../virtual/cells';
import {
  FulfilmentChip,
  PaymentChip,
  deliveryLabels,
  deliveryOptions,
  fulfilmentOptions,
  paymentOptions,
} from './labels';
import type { GiftCardAdminOrder } from './queries';

interface Props {
  fetchRows: TableFetch<GiftCardAdminOrder>;
  onRowClick: (row: GiftCardAdminOrder) => void;
}

const getRowId = (row: GiftCardAdminOrder) => row.id;

const buildColumns = (t: Translator['t'], formatDateTime: DateFormatter['formatDateTime']): DuncitColumn<GiftCardAdminOrder>[] => [
  dateColumn<GiftCardAdminOrder>({ field: 'created_at', headerName: t('loyalty.giftOrders.colPlaced'), minWidth: 170, hide: false, formatDate: formatDateTime }),
  { field: 'order_no', headerName: t('loyalty.giftOrders.colOrder'), minWidth: 150, type: 'text', valueGetter: (row) => row.order_no },
  {
    field: 'buyer_name',
    headerName: t('loyalty.giftOrders.colBuyer'),
    minWidth: 200,
    type: 'text',
    sortable: false,
    cellRenderer: (row) => renderPerson(row.buyer_name, row.buyer_email),
  },
  {
    field: 'delivery_mode',
    headerName: t('loyalty.giftOrders.colDelivery'),
    minWidth: 130,
    type: 'enum',
    options: deliveryOptions(t),
    valueGetter: (row) => deliveryLabels(t)[row.delivery_mode],
  },
  { field: 'design_name', headerName: t('loyalty.giftOrders.colDesign'), minWidth: 140, type: 'text', valueGetter: (row) => row.design_name || '—' },
  { field: 'quantity', headerName: t('loyalty.giftOrders.colQuantity'), minWidth: 90, type: 'number', valueGetter: (row) => row.quantity },
  {
    field: 'total',
    headerName: t('loyalty.giftOrders.colTotal'),
    minWidth: 120,
    type: 'number',
    valueGetter: (row) => formatMoney(row.total, { symbol: row.currency_symbol, decimals: 2 }),
  },
  {
    field: 'payment_status',
    headerName: t('loyalty.giftOrders.colPayment'),
    minWidth: 120,
    type: 'enum',
    options: paymentOptions(t),
    cellRenderer: (row) => <PaymentChip status={row.payment_status} t={t} />,
  },
  {
    field: 'fulfilment_status',
    headerName: t('loyalty.giftOrders.colStatus'),
    minWidth: 170,
    type: 'enum',
    options: fulfilmentOptions(t),
    cellRenderer: (row) => <FulfilmentChip status={row.fulfilment_status} t={t} />,
  },
  {
    field: 'awb',
    headerName: t('loyalty.giftOrders.colAwb'),
    minWidth: 150,
    type: 'text',
    sortable: false,
    filterable: false,
    valueGetter: (row) => row.shipment?.awb || '—',
  },
];

/** Every gift card order, digital and printed; a row opens the order. */
export default function OrdersTable({ fetchRows, onRowClick }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const columns = useMemo(() => buildColumns(t, formatDateTime), [t, formatDateTime]);
  return (
    <DuncitTable
      tableId="loyalty-gift-card-orders"
      columns={columns}
      fetchRows={fetchRows}
      onRowClick={onRowClick}
      getRowId={getRowId}
      emptyText={t('loyalty.giftOrders.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder={t('loyalty.giftOrders.search')}
    />
  );
}
