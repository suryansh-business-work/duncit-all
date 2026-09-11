import { useQuery } from '@apollo/client/react';
import { Alert, Card, CircularProgress, Stack, Typography } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { useTranslation } from '../i18n/useTranslation';
import PodProductOrderItem from './pod-history-page/PodProductOrderItem';
import { MY_PRODUCT_ORDERS, type ProductOrder } from './pod-history-page/productOrders';

/** My Product Order History — every product order the buyer has placed across
 * all pods (newest first), each in its own card with full fulfilment tracking. */
export default function OrdersHistoryPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(MY_PRODUCT_ORDERS, {
    fetchPolicy: 'cache-and-network',
  });
  const orders: ProductOrder[] = data?.myProductOrders ?? [];

  if (loading && orders.length === 0)
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Stack spacing={2} sx={{ py: 0.5 }}>
      <PageHeader title={t('mweb.ordersHistory.myProductOrders')} />
      {orders.length === 0 ? (
        <EmptyState icon={<LocalShippingOutlinedIcon />} title="No product orders yet" />
      ) : (
        orders.map((order) => (
          <Card key={order.id} sx={{ p: 2 }}>
            <Stack spacing={1}>
              {order.pod?.pod_title && (
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {order.pod.pod_title}
                </Typography>
              )}
              <PodProductOrderItem order={order} />
            </Stack>
          </Card>
        ))
      )}
    </Stack>
  );
}
