import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BrandProductsTable from './BrandProductsTable';
import BrandPickupPanel from './BrandPickupPanel';
import { MARKETPLACE_BRANDS, MARKETPLACE_BRAND_PRODUCTS } from './queries';

const BRAND_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  APPROVED: 'success',
  SUBMITTED: 'warning',
  DRAFT: 'default',
  REJECTED: 'error',
};

export default function EcommBrandDetailPage() {
  const navigate = useNavigate();
  const { brandId = '' } = useParams<{ brandId: string }>();

  const brandsQuery = useQuery(MARKETPLACE_BRANDS, { fetchPolicy: 'cache-and-network' });
  const productsQuery = useQuery(MARKETPLACE_BRAND_PRODUCTS, {
    variables: { brand_doc_id: brandId },
    fetchPolicy: 'cache-and-network',
  });

  const brand = (brandsQuery.data?.marketplaceBrands ?? []).find((item: any) => item.id === brandId);
  const products = productsQuery.data?.marketplaceBrandProducts ?? [];

  if (brandsQuery.loading && !brandsQuery.data) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/ecomm/brands')}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to brands
      </Button>

      {brand ? (
        <>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Avatar src={brand.logo_url || undefined} variant="rounded" sx={{ width: 64, height: 64 }}>
                  {brand.brand_name?.[0]?.toUpperCase() ?? '?'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h5" fontWeight={800}>
                      {brand.brand_name}
                    </Typography>
                    <Chip
                      size="small"
                      label={brand.status}
                      color={BRAND_STATUS_COLOR[brand.status] ?? 'default'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {[brand.city, brand.state].filter(Boolean).join(', ') || '—'} ·{' '}
                    {brand.contact_email || brand.contact_phone || 'No contact'}
                  </Typography>
                </Box>
                <Chip color="primary" variant="outlined" label={`${brand.approved_product_count} approved products`} />
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Approved products
              </Typography>
              <BrandProductsTable
                products={products}
                loading={productsQuery.loading}
                error={productsQuery.error?.message}
              />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <BrandPickupPanel brandId={brandId} />
              <Divider sx={{ mt: 2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Registering a location with ShipRocket lets SHIP orders pick up from this brand&apos;s warehouse.
              </Typography>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert severity="warning">Brand not found or not currently listed.</Alert>
      )}
    </Stack>
  );
}
