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
import { StatusChip } from '@duncit/ui';
import BrandProductsTable from './BrandProductsTable';
import BrandPickupPanel from './BrandPickupPanel';
import { BRAND_STATUS_COLOR } from './brandStatus';
import { ECOMM_BRAND } from './queries';

export default function BrandReviewDetailPage() {
  const navigate = useNavigate();
  const { brandId = '' } = useParams<{ brandId: string }>();

  // `ecommBrand` resolves a brand at ANY status; the marketplace queries are
  // approved-only, so a row opened from the review inbox showed "not found".
  const brandQuery = useQuery(ECOMM_BRAND, {
    variables: { brand_doc_id: brandId },
    fetchPolicy: 'cache-and-network',
  });

  const brand = brandQuery.data?.ecommBrand;

  if (brandQuery.loading && !brandQuery.data) {
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
        Back to Brands Review
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
                    <StatusChip status={brand.status} colorMap={BRAND_STATUS_COLOR} />
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
              <BrandProductsTable brandId={brandId} />
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
        <Alert severity="warning">Brand not found.</Alert>
      )}
    </Stack>
  );
}
