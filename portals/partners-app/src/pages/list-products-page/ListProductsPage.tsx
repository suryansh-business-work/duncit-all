import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ProductListingsTable from './ProductListingsTable';
import { PRODUCT_ACCESS_MESSAGE, PRODUCT_LISTING_ACCESS, canManageProductListings } from './productAccess';

export default function ListProductsPage() {
  const { brandId = '' } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(PRODUCT_LISTING_ACCESS, { fetchPolicy: 'cache-and-network' });
  const canManageProducts = canManageProductListings(data?.me?.roles);

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: 'primary.contrastText', background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)` }}>
        <Button onClick={() => navigate('/ecomm-brand')} startIcon={<ArrowBackIcon />} size="small" sx={{ color: 'inherit', mb: 1 }}>
          Back to brands
        </Button>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 800 }}>Product management</Typography>
            <Typography variant="h4" fontWeight={900}>Brand products</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              Add products under a Super → Category → Sub category. Once the products portal approves them they appear in matching pods.
            </Typography>
          </Box>
          <Button
            component={canManageProducts ? RouterLink : 'button'}
            to={canManageProducts ? `/ecomm-brand/${brandId}/products/new` : undefined}
            disabled={!canManageProducts}
            variant="contained"
            color="inherit"
            startIcon={<AddIcon />}
            sx={{ color: 'primary.main', bgcolor: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
          >
            Add Product
          </Button>
        </Stack>
      </Box>
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !canManageProducts && <Alert severity="warning">{PRODUCT_ACCESS_MESSAGE}</Alert>}
      <ProductListingsTable
        brandId={brandId}
        canManageProducts={canManageProducts}
        onEdit={(product) => navigate(`/ecomm-brand/${brandId}/products/${product.id}`, { state: { product } })}
      />
    </Stack>
  );
}
