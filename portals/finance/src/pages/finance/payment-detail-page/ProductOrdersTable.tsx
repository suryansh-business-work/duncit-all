import { useMemo } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { DuncitTable, EM_DASH, type DuncitColumn } from '@duncit/table';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { money, staticTableFetch, type PaymentProductOrderLine } from './queries';

const getOrderRowId = (order: PaymentProductOrderLine) => order.id;

const orderSearchText = (order: PaymentProductOrderLine) =>
  [order.order_no, order.fulfilment_method, order.fulfilment_status, order.awb ?? ''].join(' ');

function buildColumns(currencySymbol: string, t: Translator['t']): DuncitColumn<PaymentProductOrderLine>[] {
  return [
    { field: 'order_no', headerName: t('finance.payment.orderNo'), sortable: false, flex: 1, minWidth: 150 },
    { field: 'fulfilment_method', headerName: t('finance.payment.orderMethod'), sortable: false, width: 130 },
    { field: 'fulfilment_status', headerName: t('finance.payment.orderStatus'), sortable: false, width: 150 },
    { field: 'item_count', headerName: t('finance.payment.orderItems'), sortable: false, width: 90 },
    {
      field: 'total',
      headerName: t('finance.payment.orderTotal'),
      sortable: false,
      width: 110,
      valueGetter: (order) => money(currencySymbol, order.total),
    },
    {
      field: 'awb',
      headerName: t('finance.payment.orderAwb'),
      sortable: false,
      flex: 1,
      minWidth: 140,
      valueGetter: (order) => order.awb ?? EM_DASH,
    },
  ];
}

interface Props {
  orders: PaymentProductOrderLine[];
  currencySymbol: string;
}

/** The product orders this payment produced — one per shipment/pickup group. */
export default function ProductOrdersTable({ orders, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const fetchRows = useMemo(() => staticTableFetch(orders, orderSearchText), [orders]);
  const columns = useMemo(() => buildColumns(currencySymbol, t), [currencySymbol, t]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('finance.payment.ordersTitle')}
        </Typography>
        <DuncitTable<PaymentProductOrderLine>
          tableId="finance-payment-product-orders"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getOrderRowId}
          emptyText={t('finance.payment.ordersEmpty')}
          searchPlaceholder={t('finance.payment.ordersSearch')}
        />
      </CardContent>
    </Card>
  );
}
