import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import Chip from '@mui/material/Chip';
import CloseIcon from '@mui/icons-material/Close';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MomentLightbox from '../../components/moments/MomentLightbox';
import BrandDetailDialog from './BrandDetailDialog';
import ProductQuantityBar from './ProductQuantityBar';
import ProductReviews from './ProductReviews';
import { formatRupees, productSpecs, type ProductSpec } from './product-specs';
import { PUBLIC_PRODUCT } from './queries';

interface Props {
  productId: string | null;
  onClose: () => void;
  /** Current selected quantity of this product (from the pod's selection map). */
  quantity?: number;
  /** Available stock — the dialog's own query does not return it, so the pod row passes it. */
  maxQuantity?: number;
  /** Update the selection for this product; 0 removes it. */
  onUpdateQuantity?: (quantity: number) => void;
  /** View-only once the viewer has already booked this pod (no re-selecting). */
  viewOnly?: boolean;
}

/** Brand attribution — a tappable link that opens the brand dialog when the
 * product carries a brand link, else a plain label. Renders nothing when the
 * product has no brand name. */
function BrandAttribution({
  brandName,
  brandId,
  onOpenBrand,
}: Readonly<{ brandName?: string | null; brandId: string | null; onOpenBrand: (id: string) => void }>) {
  if (!brandName) return null;
  if (brandId) {
    return (
      <Link
        component="button"
        type="button"
        onClick={() => onOpenBrand(brandId)}
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 800, width: 'fit-content' }}
      >
        <StorefrontIcon sx={{ fontSize: 16 }} />
        by {brandName}
        <ChevronRightIcon sx={{ fontSize: 16 }} />
      </Link>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <StorefrontIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
        by {brandName}
      </Typography>
    </Stack>
  );
}

/** Resolve the gallery images and spec rows for the active product/variant. */
function deriveProductMedia(
  product: any,
  selectedVariant: any
): { images: string[]; specs: ProductSpec[] } {
  if (!product) return { images: [], specs: [] };
  const variantImages: string[] = selectedVariant?.images ?? [];
  const base = product.images?.length ? product.images : [product.image_url].filter(Boolean);
  const images = variantImages.length ? variantImages : base;
  const specSource = selectedVariant ? { ...product, ...selectedVariant } : product;
  return { images, specs: productSpecs(specSource) };
}

/** Product-detail dialog opened from the Pod Shop info icon — image gallery
 * (tap to zoom), price, physical specs and a tappable brand that opens a brand
 * dialog, fetched on demand for any signed-in user (Task B item 1). */
export default function ProductDetailDialog({
  productId,
  onClose,
  quantity = 0,
  maxQuantity = 0,
  onUpdateQuantity,
  viewOnly = false,
}: Readonly<Props>) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [brandOpen, setBrandOpen] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const { data, loading, error } = useQuery(PUBLIC_PRODUCT, {
    variables: { id: productId },
    skip: !productId,
    fetchPolicy: 'cache-first',
  });
  const product = data?.publicInventoryProduct;
  const variants: any[] = product?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
  const { images, specs } = deriveProductMedia(product, selectedVariant);
  const description = product?.description || product?.short_description || '';
  const price = selectedVariant?.unit_cost ?? product?.unit_cost ?? 0;
  const mrp = product?.selling_price ?? 0;
  const brandId = product?.brand_id ?? null;
  const stock = selectedVariant ? selectedVariant.inventory_count : maxQuantity;

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
        {variants.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {variants.map((v) => (
              <Chip
                key={v.id}
                label={v.option_label || v.color || v.size_label || 'Variant'}
                onClick={() => setVariantId(v.id)}
                color={selectedVariant?.id === v.id ? 'primary' : 'default'}
                variant={selectedVariant?.id === v.id ? 'filled' : 'outlined'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>
        )}
        <BrandAttribution brandName={product.brand_name} brandId={brandId} onOpenBrand={setBrandOpen} />
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
        <ProductReviews productId={product.id} />
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
        {product && !viewOnly && onUpdateQuantity ? (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <ProductQuantityBar quantity={quantity} maxQuantity={stock} onUpdate={onUpdateQuantity} />
          </DialogActions>
        ) : null}
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
