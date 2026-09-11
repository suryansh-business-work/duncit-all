import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import PodProductOrderItem from './PodProductOrderItem';
import SectionHeader from '../../components/SectionHeader';
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
        <Box sx={{ mb: 1.5 }}>
          <SectionHeader title={t('mweb.podHistory.productsAndTracking')} />
        </Box>
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
