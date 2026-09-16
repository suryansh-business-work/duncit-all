import { useMemo } from 'react';
import { DuncitTable, EM_DASH, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation, type Translator } from '@duncit/app-settings';
import SectionBlock from './SectionBlock';
import { useTableRefresh } from './useTableRefresh';
import { money, type PaymentProductOrderLine } from './queries';

const getOrderRowId = (order: PaymentProductOrderLine) => order.id;

const orderSearchText = (order: PaymentProductOrderLine) =>
  [order.order_no, order.fulfilment_method, order.fulfilment_status, order.awb ?? ''].join(' ');

function buildColumns(currencySymbol: string, t: Translator['t']): DuncitColumn<PaymentProductOrderLine>[] {
  return [
    { field: 'order_no', headerName: t('finance.payment.orderNo'), type: 'text', flex: 1, minWidth: 150 },
    { field: 'fulfilment_method', headerName: t('finance.payment.orderMethod'), type: 'text', width: 130 },
    { field: 'fulfilment_status', headerName: t('finance.payment.orderStatus'), type: 'text', width: 150 },
    { field: 'item_count', headerName: t('finance.payment.orderItems'), type: 'number', width: 90 },
    {
      field: 'total',
      headerName: t('finance.payment.orderTotal'),
      type: 'number',
      width: 110,
      valueGetter: (order) => money(currencySymbol, order.total),
    },
    {
      field: 'awb',
      headerName: t('finance.payment.orderAwb'),
      type: 'text',
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
  const columns = useMemo(() => buildColumns(currencySymbol, t), [currencySymbol, t]);
  const fetchRows = useMemo(
    () => clientTableFetch(orders, orderSearchText, columns),
    [orders, columns],
  );
  // A shipment retry writes the AWB onto these rows — see useTableRefresh.
  const refetchRef = useTableRefresh(orders);

  return (
    <SectionBlock title={t('finance.payment.ordersTitle')}>
      <DuncitTable<PaymentProductOrderLine>
        ariaLabel={t('finance.payment.ordersTitle')}
        tableId="finance-payment-product-orders"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getOrderRowId}
        refetchRef={refetchRef}
        emptyText={t('finance.payment.ordersEmpty')}
        searchPlaceholder={t('finance.payment.ordersSearch')}
      />
    </SectionBlock>
  );
}
