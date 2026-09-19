import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { PageHeader, QueryGuard } from '@duncit/ui';
import BuyerCell from '../../components/BuyerCell';
import ClientTable from '../../components/ClientTable';
import CodeWithDate from '../../components/CodeWithDate';
import { OrderStatusChip } from '../../components/chips';
import { STORE_SHIPMENT_ALERTS, type AlertOrder } from '../orders/shipping-queries';

const searchOf = (row: AlertOrder) => `${row.order_no} ${row.buyer_name} ${row.buyer_email} ${row.shiprocket.awb}`;
const idOf = (row: AlertOrder) => row.id;
const renderOrder = (row: AlertOrder) => <CodeWithDate code={row.order_no} at={row.created_at} />;
const renderBuyer = (row: AlertOrder) => <BuyerCell name={row.buyer_name} email={row.buyer_email} guest={!row.buyer_id} />;
const renderStatus = (row: AlertOrder) => <OrderStatusChip status={row.fulfilment_status} />;
const renderReason = (row: AlertOrder) => (
  <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
    {row.last_error || row.shiprocket.tracking_status}
  </Typography>
);

/**
 * Every order waiting on an operator: a booking ShipRocket refused, a wallet
 * too low for the courier, a failed delivery (NDR) to answer. Open one to fix it.
 */
export default function NeedsActionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(STORE_SHIPMENT_ALERTS, { fetchPolicy: 'cache-and-network' });
  const rows = data?.storeShipmentAlerts ?? [];
  const columns = useMemo<DuncitColumn<AlertOrder>[]>(
    () => [
      { field: 'order_no', headerName: t('shell.common.order'), type: 'text', width: 180, cellRenderer: renderOrder },
      { field: 'buyer_name', headerName: t('ecommPortal.common.buyer'), type: 'text', minWidth: 200, cellRenderer: renderBuyer },
      { field: 'fulfilment_status', headerName: t('shell.common.status'), type: 'text', width: 180, cellRenderer: renderStatus },
      { field: 'last_error', headerName: t('ecommPortal.shipping.reason'), type: 'text', minWidth: 280, flex: 1, sortable: false, cellRenderer: renderReason },
    ],
    [t],
  );
  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.needsAction')} subtitle={t('ecommPortal.shipping.needsActionSubtitle')} />
      <QueryGuard loading={loading && !data} error={error}>
        {() => (
          <ClientTable<AlertOrder>
            tableId="ecomm-needs-action"
            rows={rows}
            columns={columns}
            searchOf={searchOf}
            getRowId={idOf}
            ariaLabel={t('ecommPortal.nav.needsAction')}
            emptyText={t('ecommPortal.shipping.nothingWaiting')}
            searchPlaceholder={t('ecommPortal.orders.search')}
            onRowClick={(row) => navigate(`/orders/${row.id}`)}
          />
        )}
      </QueryGuard>
    </Stack>
  );
}
