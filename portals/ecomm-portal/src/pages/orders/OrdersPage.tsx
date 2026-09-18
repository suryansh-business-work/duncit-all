import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PageHeader } from '@duncit/ui';
import StoreTable from '../../components/StoreTable';
import { STORE_ORDERS_TABLE, type OrderRow } from './queries';
import { useOrderColumns } from './useOrderColumns';

/** Every pet-store order, newest first — open one to ship, settle or cancel it. */
export default function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const columns = useOrderColumns();
  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.orders')} subtitle={t('ecommPortal.orders.subtitle')} />
      <StoreTable<OrderRow>
        tableId="ecomm-orders"
        query={STORE_ORDERS_TABLE}
        resultKey="storeOrdersTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.orders')}
        emptyText={t('ecommPortal.orders.empty')}
        searchPlaceholder={t('ecommPortal.orders.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        onRowClick={(order) => navigate(`/orders/${order.id}`)}
      />
    </Stack>
  );
}
