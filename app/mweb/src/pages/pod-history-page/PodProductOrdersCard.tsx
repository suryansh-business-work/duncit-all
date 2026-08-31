import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PodProductOrderItem from './PodProductOrderItem';
import { MY_PRODUCT_ORDERS_FOR_POD, type ProductOrder } from './productOrders';
import { useTranslation } from '../../i18n/useTranslation';

/** "Products & tracking" — the add-on products the buyer purchased in this pod
 * with their fulfilment/tracking. Renders nothing when there are no product
 * orders (the common case), so it never clutters a plain booking. */
export default function PodProductOrdersCard({ podId }: Readonly<{ podId?: string }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(MY_PRODUCT_ORDERS_FOR_POD, {
    variables: { podId: podId ?? '' },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const orders: ProductOrder[] = data?.myProductOrdersForPod ?? [];

  if (!podId) return null;
  if (loading && orders.length === 0) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <CircularProgress size={18} />
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {t('mweb.podHistory.loadingProducts')}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }
  if (orders.length === 0) return null;

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1
          }}>
          <ShoppingBagIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            {t('mweb.podHistory.productsAndTracking')}
          </Typography>
        </Stack>
        {error && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {t('mweb.podHistory.trackingRefreshError')}
          </Alert>
        )}
        <Stack spacing={1.25}>
          {orders.map((o) => (
            <PodProductOrderItem key={o.id} order={o} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
