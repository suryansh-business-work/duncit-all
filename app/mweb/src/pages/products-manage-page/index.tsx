import { gql, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SimpleBarChart from '../../components/SimpleBarChart';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

const AVAILABLE_PRODUCTS = gql`
  query EcommDashboardProducts {
    availablePodProducts {
      id
      product_name
      unit_cost
      available_count
    }
  }
`;

/** ecomm studio dashboard — catalogue size, stock and price stats + a
 * stock-by-product chart (B3-1). */
export default function ProductsManagePage() {
  const showProducts = useFeatureFlag('is_product_visible');
  const { data, loading, error } = useQuery(AVAILABLE_PRODUCTS, {
    fetchPolicy: 'cache-and-network',
    skip: !showProducts,
  });
  if (!showProducts) {
    return (
      <Stack sx={{ maxWidth: 760, mx: 'auto', width: '100%', py: 4 }}>
        <Alert severity="info">Product features are not available right now.</Alert>
      </Stack>
    );
  }
  const products: any[] = data?.availablePodProducts ?? [];
  const totalStock = products.reduce((sum, p) => sum + (p.available_count ?? 0), 0);
  const avgPrice = products.length
    ? Math.round(products.reduce((sum, p) => sum + (p.unit_cost ?? 0), 0) / products.length)
    : 0;
  const stockChart = products
    .slice()
    .sort((a, b) => (b.available_count ?? 0) - (a.available_count ?? 0))
    .slice(0, 6)
    .map((p) => ({ label: String(p.product_name).slice(0, 8), value: p.available_count ?? 0 }));

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={{ width: 38, height: 38, borderRadius: 3, display: 'grid', placeItems: 'center', color: 'primary.contrastText', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <Inventory2Icon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
            ecomm Studio
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            Your Duncit product catalogue at a glance
          </Typography>
        </Box>
      </Stack>

      {loading && !data && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={22} />
        </Stack>
      )}
      {error && <Alert severity="error">{error.message}</Alert>}

      <Stack direction="row" spacing={1}>
        {[{ label: 'Products', value: products.length }, { label: 'In stock', value: totalStock }, { label: 'Avg price', value: `₹${avgPrice}` }].map((item) => (
          <Card key={item.label} variant="outlined" sx={{ flex: 1, borderRadius: 3 }}>
            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 950 }} noWrap>{item.label}</Typography>
              <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 950 }} noWrap>{item.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Stock by product
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Top {stockChart.length || 0} products by available units
          </Typography>
          {stockChart.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              No products in the catalogue yet.
            </Alert>
          ) : (
            <SimpleBarChart data={stockChart} />
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
