import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { useUserData } from '@duncit/user-context';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { appConfig } from '../../config/app-config';
import { INVENTORY_PRODUCTS } from '../inventory-page/queries';
import { MARKETPLACE_BRANDS } from '../ecomm/queries';
import { PRODUCT_ORDERS } from '../orders/queries';
import { formatMoney } from '@duncit/utils';
import StatTile from './StatTile';
import { computeDashboard } from './dashboard-metrics';
import { useTranslation } from '@duncit/shell';

/** Products portal dashboard — real KPIs aggregated from inventory, orders and
 * brands, arranged on the shared dashboard grid. */
export default function WelcomePage() {
  const { t } = useTranslation();
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

  const tile = (id: string, x: number, y: number, content: DashboardWidget['content']): DashboardWidget => ({
    id,
    bare: true,
    defaultLayout: { x, y, w: 3, h: 2 },
    minW: 2,
    minH: 2,
    content,
  });

  const widgets: DashboardWidget[] = [
    tile('products', 0, 0, (
      <StatTile
        icon="inventory"
        label={t('products.welcome.products')}
        value={stats.totalProducts}
        hint={`${formatMoney(stats.stockValue)} stock value`}
      />
    )),
    tile('revenue', 3, 0, (
      <StatTile
        icon="payments"
        label={t('products.welcome.revenue')}
        value={formatMoney(stats.revenue)}
        hint={`${stats.totalOrders} orders`}
      />
    )),
    tile('to-fulfil', 6, 0, (
      <StatTile
        icon="local_shipping"
        label={t('products.welcome.toFulfil')}
        value={stats.pendingFulfilment}
        hint="orders awaiting dispatch"
        color={stats.pendingFulfilment > 0 ? 'warning.main' : 'text.primary'}
      />
    )),
    tile('stock-at-risk', 9, 0, (
      <StatTile
        icon="warning"
        label={t('products.welcome.stockAtRisk')}
        value={stockAtRisk}
        hint={`${stats.outOfStock} out, ${stats.lowStock} low`}
        color={stockAtRisk > 0 ? 'error.main' : 'success.main'}
      />
    )),
    tile('brands', 0, 2, (
      <StatTile
        icon="storefront"
        label={t('products.welcome.brands')}
        value={stats.activeBrands}
        hint={`${stats.brandProducts} approved products`}
      />
    )),
    tile('avg-order-value', 3, 2, (
      <StatTile
        icon="trending_up"
        label={t('products.welcome.avgOrderValue')}
        value={formatMoney(stats.totalOrders ? stats.revenue / stats.totalOrders : 0)}
        hint="across all orders"
      />
    )),
    {
      id: 'at-a-glance',
      title: t('products.welcome.atAGlance'),
      // A single chip row under the header — h3 is mostly empty space.
      fitContent: true,
      defaultLayout: { x: 0, y: 4, w: 12, h: 3 },
      minW: 4,
      minH: 2,
      content: (
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
      ),
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="products.overview"
      header={
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hi {name} — here is how {appConfig.fullName} is doing today.
          </Typography>
          {loading && <LinearProgress sx={{ mt: 1 }} />}
          {error && <Alert severity="error" sx={{ mt: 1 }}>{error.message}</Alert>}
        </Box>
      }
      widgets={widgets}
    />
  );
}
