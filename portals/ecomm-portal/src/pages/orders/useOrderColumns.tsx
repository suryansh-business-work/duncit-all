import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { statusLabel } from '@duncit/utils';
import BuyerCell from '../../components/BuyerCell';
import { OrderStatusChip, PaymentMethodChip } from '../../components/chips';
import CodeWithDate from '../../components/CodeWithDate';
import { money } from '../../lib/format';
import { codeLabel, codeOptions, orderStatusOptions, PAYMENT_METHOD_KEYS } from '../../lib/status';
import type { OrderRow } from './queries';

const unitsOf = (row: OrderRow) => row.line_items.reduce((sum, line) => sum + line.qty, 0);

const renderBuyer = (row: OrderRow) => <BuyerCell name={row.buyer_name} email={row.buyer_email} guest={!row.buyer_id} />;
const renderOrder = (row: OrderRow) => <CodeWithDate code={row.order_no} at={row.created_at} />;
const renderPayment = (row: OrderRow) => <PaymentMethodChip method={row.payment_method} />;
const renderStatus = (row: OrderRow) => <OrderStatusChip status={row.fulfilment_status} />;

/**
 * The order table's columns. `withBuyer: false` drops the buyer column for a
 * list that is already one customer's.
 */
export function useOrderColumns(withBuyer = true): DuncitColumn<OrderRow>[] {
  const { t } = useTranslation();
  return useMemo<DuncitColumn<OrderRow>[]>(() => {
    const buyer: DuncitColumn<OrderRow>[] = withBuyer
      ? [{ field: 'buyer_name', headerName: t('ecommPortal.common.buyer'), type: 'text', minWidth: 220, flex: 1, cellRenderer: renderBuyer, valueGetter: (row) => row.buyer_name }]
      : [];
    return [
      { field: 'order_no', headerName: t('shell.common.order'), type: 'text', width: 180, cellRenderer: renderOrder, valueGetter: (row) => row.order_no },
      ...buyer,
      { field: 'items', headerName: t('ecommPortal.orders.units'), type: 'number', width: 90, sortable: false, filterable: false, valueGetter: unitsOf },
      { field: 'total', headerName: t('ecommPortal.orders.total'), type: 'number', width: 130, valueGetter: (row) => money(row.total, row.currency_symbol) },
      {
        field: 'payment_method',
        headerName: t('ecommPortal.orders.payment'),
        type: 'enum',
        options: codeOptions(PAYMENT_METHOD_KEYS, t),
        width: 130,
        cellRenderer: renderPayment,
        valueGetter: (row) => codeLabel(PAYMENT_METHOD_KEYS, row.payment_method, t),
      },
      {
        field: 'fulfilment_status',
        headerName: t('shell.common.status'),
        type: 'enum',
        options: orderStatusOptions(t),
        minWidth: 170,
        cellRenderer: renderStatus,
        valueGetter: (row) => statusLabel(row.fulfilment_status, t),
      },
      { field: 'awb', headerName: t('ecommPortal.orders.awb'), type: 'text', width: 150, valueGetter: (row) => row.shiprocket.awb || EM_DASH },
      { field: 'buyer_email', headerName: t('shell.common.email'), type: 'text', width: 200, hide: true },
      dateColumn<OrderRow>({ headerName: t('ecommPortal.orders.placed'), width: 150 }),
    ];
  }, [t, withBuyer]);
}
