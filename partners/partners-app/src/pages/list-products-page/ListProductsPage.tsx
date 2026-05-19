import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ProductListingsTable from './ProductListingsTable';
import { PRODUCT_ACCESS_MESSAGE, PRODUCT_LISTING_ACCESS, canManageProductListings } from './productAccess';

export default function ListProductsPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(PRODUCT_LISTING_ACCESS, { fetchPolicy: 'cache-and-network' });
  const canManageProducts = canManageProductListings(data?.me?.roles);

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 860, mx: 'auto' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #13281e 0%, #224739 55%, #111827 100%)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 900 }}>Product listing</Typography>
            <Typography variant="h4" fontWeight={950}>List your products</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.76)', mt: 1 }}>
              Sell your products via Duncit. Hosts can select approved products during pod creation.
            </Typography>
          </Box>
          <Button component={canManageProducts ? RouterLink : 'button'} to={canManageProducts ? '/list-products/new' : undefined} disabled={!canManageProducts} variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#fff', color: '#13281e', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}>
            Add Product
          </Button>
        </Stack>
      </Box>
      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && !canManageProducts && <Alert severity="warning">{PRODUCT_ACCESS_MESSAGE}</Alert>}
      <ProductListingsTable canManageProducts={canManageProducts} onEdit={(product) => navigate(`/list-products/${product.id}`, { state: { product } })} />
    </Stack>
  );
}