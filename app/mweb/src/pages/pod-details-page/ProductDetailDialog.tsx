import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MomentLightbox from '../../components/moments/MomentLightbox';
import BrandDetailDialog from './BrandDetailDialog';
import { formatRupees, productSpecs } from './product-specs';
import { PUBLIC_PRODUCT } from './queries';

interface Props {
  productId: string | null;
  onClose: () => void;
}

/** Product-detail dialog opened from the Pod Shop info icon — image gallery
 * (tap to zoom), price, physical specs and a tappable brand that opens a brand
 * dialog, fetched on demand for any signed-in user (Task B item 1). */
export default function ProductDetailDialog({ productId, onClose }: Readonly<Props>) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [brandOpen, setBrandOpen] = useState<string | null>(null);
  const { data, loading, error } = useQuery(PUBLIC_PRODUCT, {
    variables: { id: productId },
    skip: !productId,
    fetchPolicy: 'cache-first',
  });
  const product = data?.publicInventoryProduct;
  const images: string[] = product
    ? product.images?.length
      ? product.images
      : [product.image_url].filter(Boolean)
    : [];
  const description = product?.description || product?.short_description || '';
  const specs = product ? productSpecs(product) : [];
  const price = product?.unit_cost ?? 0;
  const mrp = product?.selling_price ?? 0;
  const brandId = product?.brand_id ?? null;

  let body: React.ReactNode = null;
  if (loading) {
    body = (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={26} />
      </Stack>
    );
  } else if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (product) {
    body = (
      <Stack spacing={1.5}>
        {images.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
            {images.map((url, imageIndex) => (
              <ButtonBase
                key={url}
                onClick={() => setZoomIndex(imageIndex)}
                aria-label="Zoom image"
                sx={{ borderRadius: 2, flex: '0 0 auto' }}
              >
                <Box
                  component="img"
                  src={url}
                  alt={product.product_name}
                  sx={{ width: 160, height: 160, borderRadius: 2, objectFit: 'cover' }}
                />
              </ButtonBase>
            ))}
          </Stack>
        )}
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {product.product_name}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>
            {formatRupees(price)}
          </Typography>
          {mrp > price && (
            <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
              {formatRupees(mrp)}
            </Typography>
          )}
        </Stack>
        {product.brand_name &&
          (brandId ? (
            <Link
              component="button"
              type="button"
              onClick={() => setBrandOpen(brandId)}
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 800, width: 'fit-content' }}
            >
              <StorefrontIcon sx={{ fontSize: 16 }} />
              by {product.brand_name}
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            </Link>
          ) : (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <StorefrontIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                by {product.brand_name}
              </Typography>
            </Stack>
          ))}
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          {description || 'No description provided.'}
        </Typography>
        {specs.length > 0 && (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            {specs.map((spec, specIndex) => (
              <Box key={spec.label}>
                {specIndex > 0 && <Divider />}
                <Stack direction="row" justifyContent="space-between" sx={{ px: 1.5, py: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {spec.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {spec.value}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Stack>
    );
  }

  return (
    <>
      <Dialog open={Boolean(productId)} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Product details
          <IconButton aria-label="Close" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>{body}</DialogContent>
      </Dialog>
      <MomentLightbox
        moments={images.map((url) => ({ url }))}
        index={zoomIndex}
        onClose={() => setZoomIndex(null)}
        onIndexChange={setZoomIndex}
      />
      <BrandDetailDialog brandId={brandOpen} onClose={() => setBrandOpen(null)} />
    </>
  );
}
