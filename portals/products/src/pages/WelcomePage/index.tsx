import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { useUserData } from '@duncit/user-context';
import { appConfig } from '../../config/app-config';
import { INVENTORY_PRODUCTS } from '../inventory-page/queries';
import { MARKETPLACE_BRANDS } from '../ecomm/queries';
import { PRODUCT_ORDERS } from '../orders/queries';
import StatTile from './StatTile';
import { computeDashboard, formatMoney } from './dashboard-metrics';

/** Products portal dashboard — real KPIs aggregated from inventory, orders and
 * brands, replacing the old "coming soon" placeholder (Task B item 5). */
export default function WelcomePage() {
  const { user } = useUserData();
  const name = user?.first_name || user?.full_name || 'there';

  const products = useQuery(INVENTORY_PRODUCTS, { fetchPolicy: 'cache-and-network' });
  const orders = useQuery(PRODUCT_ORDERS, {
    variables: { filter: {} },
    fetchPolicy: 'cache-and-network',
  });
  const brands = useQuery(MARKETPLACE_BRANDS, { fetchPolicy: 'cache-and-network' });

  const loading = products.loading || orders.loading || brands.loading;
  const error = products.error || orders.error || brands.error;

  const stats = useMemo(
    () =>
      computeDashboard(
        products.data?.inventoryProducts ?? [],
        orders.data?.productOrders ?? [],
        brands.data?.marketplaceBrands ?? [],
      ),
    [products.data, orders.data, brands.data],
  );

  const stockAtRisk = stats.lowStock + stats.outOfStock;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hi {name} — here is how {appConfig.fullName} is doing today.
        </Typography>
      </Box>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error.message}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <StatTile
          icon="inventory"
          label="Products"
          value={stats.totalProducts}
          hint={`${formatMoney(stats.stockValue)} stock value`}
        />
        <StatTile
          icon="payments"
          label="Revenue"
          value={formatMoney(stats.revenue)}
          hint={`${stats.totalOrders} orders`}
        />
        <StatTile
          icon="local_shipping"
          label="To fulfil"
          value={stats.pendingFulfilment}
          hint="orders awaiting dispatch"
          color={stats.pendingFulfilment > 0 ? 'warning.main' : 'text.primary'}
        />
        <StatTile
          icon="warning"
          label="Stock at risk"
          value={stockAtRisk}
          hint={`${stats.outOfStock} out, ${stats.lowStock} low`}
          color={stockAtRisk > 0 ? 'error.main' : 'success.main'}
        />
        <StatTile
          icon="storefront"
          label="Brands"
          value={stats.activeBrands}
          hint={`${stats.brandProducts} approved products`}
        />
        <StatTile
          icon="trending_up"
          label="Avg order value"
          value={formatMoney(stats.totalOrders ? stats.revenue / stats.totalOrders : 0)}
          hint="across all orders"
        />
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            At a glance
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              color={stats.pendingFulfilment > 0 ? 'warning' : 'success'}
              label={`${stats.pendingFulfilment} orders to fulfil`}
            />
            <Chip
              color={stats.outOfStock > 0 ? 'error' : 'default'}
              variant="outlined"
              label={`${stats.outOfStock} out of stock`}
            />
            <Chip variant="outlined" label={`${stats.lowStock} low stock`} />
            <Chip variant="outlined" label={`${stats.activeBrands} brands live`} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
