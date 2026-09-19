import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { PageHeader, QueryGuard } from '@duncit/ui';
import BuyerCell from '../../components/BuyerCell';
import ClientTable from '../../components/ClientTable';
import CodeWithDate from '../../components/CodeWithDate';
import { OrderStatusChip } from '../../components/chips';
import { runAction } from '../../lib/actions';
import { RETRY_FAILED_BOOKINGS, STORE_SHIPMENT_ALERTS, type AlertOrder, type BookingRetry } from '../orders/shipping-queries';

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
  const confirm = useConfirm();
  const { data, loading, error } = useQuery(STORE_SHIPMENT_ALERTS, { fetchPolicy: 'cache-and-network' });
  const [retry, retryState] = useMutation(RETRY_FAILED_BOOKINGS, { refetchQueries: ['StoreShipmentAlerts'], awaitRefetchQueries: true });
  const rows = data?.storeShipmentAlerts ?? [];
  const failedCount = rows.filter((row) => row.fulfilment_status === 'FAILED').length;

  const retryAll = async () => {
    const ok = await confirm({
      title: t('ecommPortal.shipping.retryAllTitle'),
      message: t('ecommPortal.shipping.retryAllMessage', { vars: { count: failedCount } }),
      confirmLabel: t('ecommPortal.shipping.retryAll'),
      cancelLabel: t('shell.common.cancel'),
    });
    if (!ok) return;
    let outcome: BookingRetry = { attempted: 0, booked: 0, failed: 0 };
    await runAction(
      async () => {
        const result = await retry();
        outcome = result.data?.storeRetryFailedBookings ?? outcome;
      },
      () => t('ecommPortal.shipping.retryAllDone', { vars: { ...outcome } }),
    );
  };
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
      <PageHeader
        title={t('ecommPortal.nav.needsAction')}
        subtitle={t('ecommPortal.shipping.needsActionSubtitle')}
        actions={
          <DuncitButton variant="contained" startIcon={<ReplayIcon />} disabled={failedCount === 0} loading={retryState.loading} onClick={retryAll}>
            {t('ecommPortal.shipping.retryAll')}
          </DuncitButton>
        }
      />
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
