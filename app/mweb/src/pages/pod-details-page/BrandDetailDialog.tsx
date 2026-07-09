import { useQuery } from '@apollo/client';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlaceIcon from '@mui/icons-material/Place';
import EventIcon from '@mui/icons-material/Event';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { PUBLIC_BRAND } from './queries';

/** Brand-detail dialog opened by tapping the brand name in the product dialog —
 * logo/cover, tagline, description and stats, fetched on demand (Task B item 1). */
export default function BrandDetailDialog({
  brandId,
  onClose,
}: Readonly<{ brandId: string | null; onClose: () => void }>) {
  const { data, loading } = useQuery(PUBLIC_BRAND, {
    variables: { id: brandId },
    skip: !brandId,
    fetchPolicy: 'cache-first',
  });
  const brand = data?.publicEcommBrand;
  const location = brand ? [brand.city, brand.state].filter(Boolean).join(', ') : '';

  return (
    <Dialog open={Boolean(brandId)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        Brand
        <IconButton aria-label="Close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading && !brand ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={26} />
          </Stack>
        ) : brand ? (
          <Stack spacing={1.5}>
            {brand.cover_image_url && (
              <Box
                component="img"
                src={brand.cover_image_url}
                alt={brand.brand_name}
                sx={{ width: '100%', height: 128, borderRadius: 2, objectFit: 'cover' }}
              />
            )}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar src={brand.logo_url || undefined} variant="rounded" sx={{ width: 52, height: 52 }}>
                <StorefrontIcon />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }} noWrap>
                  {brand.brand_name}
                </Typography>
                {brand.tagline && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }} noWrap>
                    {brand.tagline}
                  </Typography>
                )}
              </Box>
            </Stack>
            {brand.description && (
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                {brand.description}
              </Typography>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {location && <Chip size="small" icon={<PlaceIcon />} label={location} />}
              {brand.established_year && (
                <Chip size="small" icon={<EventIcon />} label={`Since ${brand.established_year}`} />
              )}
              <Chip
                size="small"
                icon={<Inventory2Icon />}
                label={`${brand.approved_product_count} products`}
              />
            </Stack>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Brand details are unavailable.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
