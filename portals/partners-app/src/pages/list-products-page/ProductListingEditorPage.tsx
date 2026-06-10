import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ListProductsForm } from './list-products';
import { MY_PRODUCT_LISTINGS } from './ProductListingsTable';
import { PRODUCT_ACCESS_MESSAGE, PRODUCT_LISTING_ACCESS, canManageProductListings } from './productAccess';

export default function ProductListingEditorPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateProduct = (location.state as { product?: any } | null)?.product;
  const editing = Boolean(productId);
  const { data: accessData, loading: accessLoading, error: accessError } = useQuery(PRODUCT_LISTING_ACCESS, { fetchPolicy: 'cache-and-network' });
  const { data, loading, error } = useQuery(MY_PRODUCT_LISTINGS, { skip: !editing || Boolean(stateProduct), fetchPolicy: 'cache-and-network' });
  const canManageProducts = canManageProductListings(accessData?.me?.roles);
  const product = stateProduct || data?.myProductListings?.find((item: any) => item.id === productId) || null;

  if ((accessLoading && !accessData) || (editing && loading && !product)) {
    return <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={24} /></Stack>;
  }

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 860, mx: 'auto' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #13281e 0%, #224739 55%, #111827 100%)' }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Button onClick={() => navigate('/list-products')} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.55)' }}>
            Back
          </Button>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 900 }}>{editing ? 'Edit product' : 'New product'}</Typography>
            <Typography variant="h4" fontWeight={950}>{editing ? product?.product_name || 'Product listing' : 'Add Product'}</Typography>
          </Box>
        </Stack>
      </Box>
      {accessError && <Alert severity="error">{accessError.message}</Alert>}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!canManageProducts ? <Alert severity="warning">{PRODUCT_ACCESS_MESSAGE}</Alert> : editing && !product && !loading ? <Alert severity="warning">Product listing was not found.</Alert> : <ListProductsForm product={product} onSaved={() => navigate('/list-products', { replace: true })} />}
    </Stack>
  );
}