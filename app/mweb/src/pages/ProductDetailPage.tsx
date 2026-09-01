import { useState } from 'react';
import { useEntityPageMeta } from '../app/pageMeta';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitIconButton } from '@duncit/buttons';
import MomentLightbox from '../components/moments/MomentLightbox';
import BrandDetailDialog from './pod-details-page/BrandDetailDialog';
import ProductReviews from './pod-details-page/ProductReviews';
import ProductQuantityBar from './pod-details-page/ProductQuantityBar';
import { formatRupees, productSpecs } from './pod-details-page/product-specs';
import { PUBLIC_PRODUCT } from './pod-details-page/queries';
import { cartLineKey, useCart } from '../components/cart/CartContext';
import { useTranslation } from '../i18n/useTranslation';

/** Pods that stock a catalogue product — the per-pod cart context so a buyer can
 * add the product from this pod-less standalone page (products stay separate). */
export const PODS_FOR_PRODUCT = gql`
  query PodsForProduct($id: ID!) {
    podsForProduct(product_doc_id: $id) {
      pod_id
      pod_title
      club_slug
      product_name
      unit_cost
      available_count
      free_delivery_above
      image_url
    }
  }
`;

/** Standalone product detail page (Pod Shop browse → tap a product). Browse-only:
 * products are purchased through a pod's shop, so there is no add-to-cart here —
 * variant chips swap the shown price/stock/images exactly like the pod dialog. */
export default function ProductDetailPage() {
  const { t } = useTranslation();
  const { productId = '' } = useParams();
  const navigate = useNavigate();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [brandOpen, setBrandOpen] = useState<string | null>(null);
  const { lines, setLine } = useCart();
  const { data, loading, error } = useQuery<any>(PUBLIC_PRODUCT, {
    variables: { id: productId },
    skip: !productId,
    fetchPolicy: 'cache-first',
  });
  const { data: podData } = useQuery<any>(PODS_FOR_PRODUCT, {
    variables: { id: productId },
    skip: !productId,
    fetchPolicy: 'cache-and-network',
  });

  const product = data?.publicInventoryProduct;
  useEntityPageMeta(product?.name);
  const variants: any[] = product?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
  const variantImages: string[] = selectedVariant?.images ?? [];
  const baseImages = product?.images?.length
    ? product.images
    : [product?.image_url].filter(Boolean);
  const images: string[] = variantImages.length ? variantImages : baseImages;
  const price = selectedVariant?.unit_cost ?? product?.unit_cost ?? 0;
  const specs = productSpecs(selectedVariant ? { ...product, ...selectedVariant } : product);

  // Auto-pick the cheapest live pod that stocks the product so the buyer can add
  // it here (the pod stays invisible — the product is the hero, per req 3).
  const pods: any[] = [...(podData?.podsForProduct ?? [])];
  pods.sort((a, b) => a.unit_cost - b.unit_cost);
  const pod = pods[0] ?? null;
  const variantLabel = selectedVariant
    ? selectedVariant.option_label ||
      selectedVariant.color ||
      selectedVariant.size_label ||
      'Variant'
    : '';
  const lineKey = cartLineKey({
    product_id: productId,
    variant_id: selectedVariant?.id ?? '',
  });
  const lineQuantity = pod
    ? (lines.find((l) => l.pod_id === pod.pod_id && cartLineKey(l) === lineKey)?.quantity ?? 0)
    : 0;
  const updateQuantity = (quantity: number) => {
    if (!pod) return;
    setLine(
      {
        pod_id: pod.pod_id,
        pod_title: pod.pod_title,
        club_slug: pod.club_slug,
        product_id: productId,
        variant_id: selectedVariant?.id ?? '',
        variant_label: variantLabel,
        product_name: pod.product_name,
        image_url: selectedVariant?.images?.[0] || pod.image_url,
        unit_cost: selectedVariant?.unit_cost ?? pod.unit_cost,
        max_quantity: pod.available_count,
        free_delivery_above: pod.free_delivery_above ?? null,
      },
      quantity,
    );
  };

  if (loading && !product)
    return (
      <Stack
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!product) return <Alert severity="info">{t('mweb.productDetailPage.productNotFound')}</Alert>;

  return (
    <Stack spacing={1.5} sx={{ py: 0.5 }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <DuncitIconButton aria-label={t('mweb.common.goBack')} onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </DuncitIconButton>
        <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
          {product.product_name}
        </Typography>
      </Stack>
      {images.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {images.map((url: string, imageIndex: number) => (
            <Box
              key={url}
              component="img"
              src={url}
              alt={product.product_name}
              onClick={() => setZoomIndex(imageIndex)}
              sx={{
                width: 180,
                height: 180,
                borderRadius: '16px',
                objectFit: 'cover',
                cursor: 'zoom-in',
                flex: '0 0 auto',
              }}
            />
          ))}
        </Stack>
      )}
      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
        {formatRupees(price)}
      </Typography>
      {variants.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          {variants.map((v: any) => (
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
      {product.brand_name && (
        <Chip
          label={`by ${product.brand_name}`}
          size="small"
          onClick={product.brand_id ? () => setBrandOpen(product.brand_id) : undefined}
          sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
        />
      )}
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          whiteSpace: 'pre-wrap'
        }}>
        {product.description || product.short_description || 'No description provided.'}
      </Typography>
      {specs.length > 0 && (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {specs.map((spec) => (
            <Stack
              key={spec.label}
              direction="row"
              sx={{
                justifyContent: "space-between",
                px: 1.5,
                py: 1,
                '& + &': { borderTop: 1, borderColor: 'divider' }
              }}>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontWeight: 700
                }}>
                {spec.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {spec.value}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}
      {pod ? (
        <ProductQuantityBar
          quantity={lineQuantity}
          maxQuantity={pod.available_count}
          onUpdate={updateQuantity}
        />
      ) : (
        <Alert severity="info" sx={{ borderRadius: '16px' }}>
          Products are purchased from a pod&apos;s shop while booking — find this product in a pod
          near you.
        </Alert>
      )}
      <ProductReviews productId={product.id} />
      <MomentLightbox
        moments={images.map((url: string) => ({ url }))}
        index={zoomIndex}
        onClose={() => setZoomIndex(null)}
        onIndexChange={setZoomIndex}
      />
      <BrandDetailDialog brandId={brandOpen} onClose={() => setBrandOpen(null)} />
    </Stack>
  );
}
