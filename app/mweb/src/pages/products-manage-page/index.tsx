import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SimpleBarChart from '../../components/SimpleBarChart';
import StudioPageHeader from '../../components/StudioPageHeader';
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
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader
        icon={<Inventory2Icon fontSize="small" />}
        title={t('mweb.productsManage.ecommStudio')}
      />

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

      <Stack direction="row" spacing={1.25}>
        {[{ label: t('mweb.productsManage.products'), value: products.length }, { label: t('mweb.productsManage.inStock'), value: totalStock }, { label: t('mweb.productsManage.avgPrice'), value: `₹${avgPrice}` }].map((item) => (
          <Card key={item.label} sx={{ flex: 1, minWidth: 0 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography
                variant="caption"
                noWrap
                component="p"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600
                }}>{item.label}</Typography>
              <Typography variant="h6" sx={{ mt: 0.25, fontWeight: 700 }} noWrap>{item.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontSize: '1rem' }}>
            Stock by product
          </Typography>
          {stockChart.length === 0 ? (
            <Stack spacing={1.25} sx={{ alignItems: 'center', py: 2 }}>
              <Inventory2Icon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                No products in the catalogue yet.
              </Typography>
            </Stack>
          ) : (
            <SimpleBarChart data={stockChart} />
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
