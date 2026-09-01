import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PodProductOrderItem from './pod-history-page/PodProductOrderItem';
import { MY_PRODUCT_ORDERS, type ProductOrder } from './pod-history-page/productOrders';

/** My Product Order History — every product order the buyer has placed across
 * all pods (newest first), each with its full fulfilment tracking. */
export default function OrdersHistoryPage() {
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

  if (orders.length === 0) {
    return (
      <Stack
        spacing={1.5}
        sx={{
          alignItems: "center",
          py: 8,
          textAlign: 'center'
        }}>
        <LocalShippingIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
        <Typography variant="h6" sx={{
          fontWeight: 700
        }}>
          No product orders yet
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Products you buy from a pod&apos;s shop will show up here with tracking.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ py: 0.5 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
          My Product Orders
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 0.5,
            fontWeight: 700
          }}>
          Every product you bought from a Pod Shop, with live tracking
        </Typography>
      </Box>
      {orders.map((order) => (
        <Stack key={order.id} spacing={0.5}>
          {order.pod?.pod_title && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600
              }}>
              {order.pod.pod_title}
            </Typography>
          )}
          <PodProductOrderItem order={order} />
        </Stack>
      ))}
    </Stack>
  );
}
