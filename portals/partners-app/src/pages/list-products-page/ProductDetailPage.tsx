import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ProductDetailView from './ProductDetailView';
import ProductReviewsPanel from './ProductReviewsPanel';
import { MY_PRODUCT_LISTINGS } from './ProductListingsTable';
import { PRODUCT_ACCESS_MESSAGE, PRODUCT_LISTING_ACCESS, canManageProductListings } from './productAccess';

export default function ProductDetailPage() {
  const { brandId = '', productId = '' } = useParams<{ brandId: string; productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const productsHome = `/ecomm-brand/${brandId}/products`;
  const stateProduct = (location.state as { product?: any } | null)?.product;
  const { data: accessData, loading: accessLoading, error: accessError } = useQuery(PRODUCT_LISTING_ACCESS, {
    fetchPolicy: 'cache-and-network',
  });
  const { data, loading, error } = useQuery(MY_PRODUCT_LISTINGS, {
    variables: { brand_id: brandId },
    skip: Boolean(stateProduct),
    fetchPolicy: 'cache-and-network',
  });
  const canManageProducts = canManageProductListings(accessData?.me?.roles);
  const product = stateProduct || data?.myProductListings?.find((item: any) => item.id === productId) || null;

  if ((accessLoading && !accessData) || (loading && !product)) {
    return (
      <Stack alignItems="center" sx={{ py: 5 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  const notFound = !product && !loading;
  const editProduct = () => navigate(`${productsHome}/${productId}`, { state: { product } });

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          color: 'primary.contrastText',
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.25}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Button
              onClick={() => navigate(productsHome)}
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.55)' }}
            >
              Back
            </Button>
            <Box>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 900 }}>
                Product details
              </Typography>
              <Typography variant="h4" fontWeight={950}>
                {product?.product_name || 'Product listing'}
              </Typography>
            </Box>
          </Stack>
          {canManageProducts && product && (
            <Button
              onClick={editProduct}
              startIcon={<EditIcon />}
              variant="contained"
              color="inherit"
              sx={{ color: 'primary.main', bgcolor: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
            >
              Edit
            </Button>
          )}
        </Stack>
      </Box>
      {accessError && <Alert severity="error">{accessError.message}</Alert>}
      {error && <Alert severity="error">{error.message}</Alert>}
      {!canManageProducts && <Alert severity="warning">{PRODUCT_ACCESS_MESSAGE}</Alert>}
      {canManageProducts && notFound && <Alert severity="warning">Product listing was not found.</Alert>}
      {canManageProducts && product && (
        <>
          <ProductDetailView product={product} />
          <ProductReviewsPanel productId={product.id} />
        </>
      )}
    </Stack>
  );
}
