import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SimpleBarChart from '../../components/SimpleBarChart';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useTranslation } from '../../i18n/useTranslation';

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
  const { t } = useTranslation();
  const showProducts = useFeatureFlag('is_product_visible');
  const { data, loading, error } = useQuery<any>(AVAILABLE_PRODUCTS, {
    fetchPolicy: 'cache-and-network',
    skip: !showProducts,
  });
  if (!showProducts) {
    return (
      <Stack sx={{ maxWidth: 760, mx: 'auto', width: '100%', py: 4 }}>
        <Alert severity="info">{t('mweb.productsManage.productFeaturesAreNotAvailableRight')}</Alert>
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
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <Box sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'primary.contrastText', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <Inventory2Icon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            ecomm Studio
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            Your Duncit product catalogue at a glance
          </Typography>
        </Box>
      </Stack>

      {loading && !data && (
        <Stack
          sx={{
            alignItems: "center",
            py: 4
          }}>
          <CircularProgress size={22} />
        </Stack>
      )}
      {error && <Alert severity="error">{error.message}</Alert>}

      <Stack direction="row" spacing={1}>
        {[{ label: t('mweb.productsManage.products'), value: products.length }, { label: t('mweb.productsManage.inStock'), value: totalStock }, { label: t('mweb.productsManage.avgPrice'), value: `₹${avgPrice}` }].map((item) => (
          <Card key={item.label} variant="outlined" sx={{ flex: 1, borderRadius: '16px' }}>
            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: "primary.main",
                  fontWeight: 700
                }}>{item.label}</Typography>
              <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 700 }} noWrap>{item.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: '16px' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Stock by product
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>
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
