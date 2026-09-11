import { useState } from 'react';
import { useEntityPageMeta } from '../app/pageMeta';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitRoundButton } from '@duncit/buttons';
import MomentLightbox from '../components/moments/MomentLightbox';
import BrandDetailDialog from './pod-details-page/BrandDetailDialog';
import ProductReviews from './pod-details-page/ProductReviews';
import { formatRupees, productSpecs } from './pod-details-page/product-specs';
import { PUBLIC_PRODUCT } from './pod-details-page/queries';
import ProductGallery from './product-detail-page/ProductGallery';
import ProductInfoCard from './product-detail-page/ProductInfoCard';
import ProductBuyBar from './product-detail-page/ProductBuyBar';
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

const BACK_SX = {
  width: 40,
  height: 40,
  minHeight: 40,
  alignSelf: 'flex-start',
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid var(--duncit-card-border)',
} as const;
const PILL_SX = { height: 36, minHeight: 36, px: 0.5, fontWeight: 600 } as const;
const IDLE_PILL_SX = { ...PILL_SX, bgcolor: 'background.paper' } as const;

const variantName = (v: any): string => v.option_label || v.color || v.size_label || 'Variant';

/** Standalone product detail page (Pod Shop browse → tap a product). The hero
 * carousel, name, price, variant pills and description, with the add/quantity
 * control in a sticky bottom bar — variant pills swap the shown price/stock/
 * images exactly like the pod dialog. */
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
  const variantLabel = selectedVariant ? variantName(selectedVariant) : '';
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
      <Stack sx={{ alignItems: "center", p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!product) return <Alert severity="info">{t('mweb.productDetailPage.productNotFound')}</Alert>;

  return (
    <Stack spacing={2} sx={{ py: 0.5 }}>
      <DuncitRoundButton aria-label={t('mweb.common.goBack')} onClick={() => navigate(-1)} sx={BACK_SX}>
        <ArrowBackIcon />
      </DuncitRoundButton>
      {images.length > 0 && <ProductGallery images={images} alt={product.product_name} onZoom={setZoomIndex} />}
      <Stack spacing={0.75}>
        <Typography component="h1" sx={{ fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.25 }}>
          {product.product_name}
        </Typography>
        <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatRupees(price)}</Typography>
      </Stack>
      {variants.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {variants.map((v: any) => {
            const selected = selectedVariant?.id === v.id;
            return (
              <Chip
                key={v.id}
                label={variantName(v)}
                onClick={() => setVariantId(v.id)}
                color={selected ? 'primary' : 'default'}
                sx={selected ? PILL_SX : IDLE_PILL_SX}
              />
            );
          })}
        </Stack>
      )}
      {product.brand_name && (
        <Chip
          label={`by ${product.brand_name}`}
          onClick={product.brand_id ? () => setBrandOpen(product.brand_id) : undefined}
          sx={{ ...IDLE_PILL_SX, alignSelf: 'flex-start' }}
        />
      )}
      <ProductInfoCard
        description={product.description || product.short_description || 'No description provided.'}
        specs={specs}
      />
      {pod ? null : (
        <Alert severity="info">
          Products are purchased from a pod&apos;s shop while booking — find this product in a pod
          near you.
        </Alert>
      )}
      <ProductReviews productId={product.id} />
      {pod ? (
        <ProductBuyBar
          price={formatRupees(price)}
          quantity={lineQuantity}
          maxQuantity={pod.available_count}
          onUpdate={updateQuantity}
        />
      ) : null}
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
