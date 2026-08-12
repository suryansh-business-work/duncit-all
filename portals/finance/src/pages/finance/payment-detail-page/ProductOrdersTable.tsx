import { useMemo } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { DuncitTable, EM_DASH, type DuncitColumn } from '@duncit/table';
import { money, staticTableFetch, type PaymentProductOrderLine } from './queries';

const getOrderRowId = (order: PaymentProductOrderLine) => order.id;

const orderSearchText = (order: PaymentProductOrderLine) =>
  [order.order_no, order.fulfilment_method, order.fulfilment_status, order.awb ?? ''].join(' ');

function buildColumns(currencySymbol: string): DuncitColumn<PaymentProductOrderLine>[] {
  return [
    { field: 'order_no', headerName: 'Order no', sortable: false, flex: 1, minWidth: 150 },
    { field: 'fulfilment_method', headerName: 'Method', sortable: false, width: 130 },
    { field: 'fulfilment_status', headerName: 'Status', sortable: false, width: 150 },
    { field: 'item_count', headerName: 'Items', sortable: false, width: 90 },
    {
      field: 'total',
      headerName: 'Total',
      sortable: false,
      width: 110,
      valueGetter: (order) => money(currencySymbol, order.total),
    },
    {
      field: 'awb',
      headerName: 'AWB',
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
  const fetchRows = useMemo(() => staticTableFetch(orders, orderSearchText), [orders]);
  const columns = useMemo(() => buildColumns(currencySymbol), [currencySymbol]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Product Orders
        </Typography>
        <DuncitTable<PaymentProductOrderLine>
          tableId="finance-payment-product-orders"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getOrderRowId}
          emptyText="No product orders on this payment."
          searchPlaceholder="Search order no or AWB"
        />
      </CardContent>
    </Card>
  );
}
