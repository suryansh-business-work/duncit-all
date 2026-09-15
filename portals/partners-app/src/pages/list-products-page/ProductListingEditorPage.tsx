import { useLocation, useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { ListProductsForm } from './list-products';
import ProductReviewsPanel from './ProductReviewsPanel';
import { MY_PRODUCT_LISTINGS } from './ProductListingsTable';
import {
  PRODUCT_ACCESS_MESSAGE,
  PRODUCT_LISTING_ACCESS,
  canManageProductListings,
} from './productAccess';
import { useTranslation } from '@duncit/shell';
import { primaryHeroBackground } from '../../components/primaryHero';

export default function ProductListingEditorPage() {
  const { t } = useTranslation();
  const { brandId = '', productId } = useParams<{ brandId: string; productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const productsHome = `/ecomm-brand/${brandId}/products`;
  const stateProduct = (location.state as { product?: any } | null)?.product;
  const editing = Boolean(productId);
  const { data: accessData, loading: accessLoading, error: accessError } = useQuery<any>(PRODUCT_LISTING_ACCESS, { fetchPolicy: 'cache-and-network' });
  const { data, loading, error } = useQuery<any>(MY_PRODUCT_LISTINGS, { variables: { brand_id: brandId }, skip: !editing || Boolean(stateProduct), fetchPolicy: 'cache-and-network' });
  const canManageProducts = canManageProductListings(accessData?.me?.roles);
  const product = stateProduct || data?.myProductListings?.find((item: any) => item.id === productId) || null;

  if ((accessLoading && !accessData) || (editing && loading && !product)) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 5
        }}><CircularProgress size={24} aria-label={t('shell.a11y.loading')} /></Stack>
    );
  }

  const notFound = editing && !product && !loading;
  const managedContent = notFound
    ? <Alert severity="warning">{t('partners.listProductsPage.productListingWasNotFound')}</Alert>
    : <ListProductsForm brandId={brandId} product={product} onSaved={() => navigate(productsHome, { replace: true })} />;
  const content = canManageProducts ? managedContent : <Alert severity="warning">{PRODUCT_ACCESS_MESSAGE}</Alert>;

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box sx={{ p: 2.5, borderRadius: 2, color: 'common.white', background: primaryHeroBackground }}>
        <Stack direction="row" spacing={1.25} sx={{
          alignItems: "center"
        }}>
          <DuncitButton onClick={() => navigate(productsHome)} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.55)' }}>
            {t('partners.venueAvailabilityPage.back')}
          </DuncitButton>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 900 }}>{editing ? 'Edit product' : 'New product'}</Typography>
            <Typography variant="h4" component="h1" sx={{
              fontWeight: 950
            }}>{editing ? product?.product_name || 'Product listing' : 'Add Product'}</Typography>
          </Box>
        </Stack>
      </Box>
      {accessError && <Alert severity="error">{accessError.message}</Alert>}
      {error && <Alert severity="error">{error.message}</Alert>}
      {content}
      {editing && product && canManageProducts && <ProductReviewsPanel productId={product.id} />}
    </Stack>
  );
}