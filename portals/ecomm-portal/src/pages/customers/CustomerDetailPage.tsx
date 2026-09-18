import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Grid, Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { EM_DASH } from '@duncit/table';
import { BackHeader, QueryGuard, StatCard } from '@duncit/ui';
import ClientTable from '../../components/ClientTable';
import { money } from '../../lib/format';
import { STORE_CUSTOMER_ORDERS, type OrderRow } from '../orders/queries';
import { useOrderColumns } from '../orders/useOrderColumns';

const isCancelled = (order: OrderRow) => order.fulfilment_status === 'CANCELLED';

/** One buyer's history (`/customers/:email`): what they have spent, and every order, newest first. */
export default function CustomerDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate } = useDateFormat();
  const { email = '' } = useParams<{ email: string }>();
  const { data, loading, error } = useQuery(STORE_CUSTOMER_ORDERS, { variables: { email }, fetchPolicy: 'cache-and-network' });
  const columns = useOrderColumns(false);
  const orders = useMemo(() => data?.storeCustomerOrders ?? [], [data]);
  const searchOf = useCallback((order: OrderRow) => `${order.order_no} ${order.shiprocket.awb}`, []);
  const kept = orders.filter((order) => !isCancelled(order));
  const spent = kept.reduce((sum, order) => sum + order.total - order.discount_total, 0);
  const name = orders[0]?.buyer_name || email;
  const stats = [
    { key: 'orders', label: t('ecommPortal.nav.orders'), value: String(orders.length) },
    { key: 'cancelled', label: t('ecommPortal.customers.cancelled'), value: String(orders.length - kept.length) },
    { key: 'spent', label: t('ecommPortal.customers.spent'), value: money(spent, orders[0]?.currency_symbol) },
    { key: 'last', label: t('ecommPortal.customers.lastOrder'), value: orders[0] ? formatDate(orders[0].created_at) : EM_DASH },
  ];
  return (
    <Stack spacing={3}>
      <BackHeader
        title={name}
        eyebrow={email}
        backTo="/customers"
        backAriaLabel={t('ecommPortal.common.backTo', { vars: { name: t('ecommPortal.nav.customers') } })}
      />
      <QueryGuard loading={loading && !data} error={error}>
        <Stack spacing={3}>
          <Grid container spacing={2}>
            {stats.map((stat) => (
              <Grid key={stat.key} size={{ xs: 6, md: 3 }}>
                <StatCard label={stat.label} value={stat.value} />
              </Grid>
            ))}
          </Grid>
          <ClientTable<OrderRow>
            tableId="ecomm-customer-orders"
            rows={orders}
            columns={columns}
            searchOf={searchOf}
            getRowId={(order) => order.id}
            ariaLabel={t('ecommPortal.customers.orderHistory')}
            emptyText={t('ecommPortal.orders.empty')}
            searchPlaceholder={t('ecommPortal.orders.search')}
            onRowClick={(order) => navigate(`/orders/${order.id}`)}
          />
        </Stack>
      </QueryGuard>
    </Stack>
  );
}
