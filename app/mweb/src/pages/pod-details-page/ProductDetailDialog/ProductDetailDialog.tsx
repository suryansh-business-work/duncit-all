import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import MomentLightbox from '../../../components/moments/MomentLightbox';
import BrandDetailDialog from '../BrandDetailDialog';
import ProductQuantityBar from '../ProductQuantityBar';
import { PUBLIC_PRODUCT, RECORD_PRODUCT_CLICK, RECORD_PRODUCT_VIEW } from '../queries';
import { selectionKey } from '../../../utils/product-selection';
import { useTranslation } from '../../../i18n/useTranslation';
import { deriveProductMedia } from './deriveProductMedia';
import ProductDetailBody from './ProductDetailBody';
import type { VariantPick } from './types';

interface Props {
  productId: string | null;
  onClose: () => void;
  /** The pod's selection map (composite keys) — the dialog reads its own line. */
  selection?: Record<string, number>;
  /** Pod-level stock cap (stocked − sold) — bounds every variant of this product. */
  maxQuantity?: number;
  /** Update the active line (base or picked variant); 0 removes it. */
  onUpdateLine?: (quantity: number, variant: VariantPick | null) => void;
  /** View-only once the viewer has already booked this pod (no re-selecting). */
  viewOnly?: boolean;
}

/** Product-detail dialog opened from the Pod Shop info icon — image gallery
 * (tap to zoom), price, physical specs and a tappable brand that opens a brand
 * dialog, fetched on demand for any signed-in user (Task B item 1). */
export default function ProductDetailDialog({
  productId,
  onClose,
  selection,
  maxQuantity = 0,
  onUpdateLine,
  viewOnly = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [brandOpen, setBrandOpen] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [recordView] = useMutation<any>(RECORD_PRODUCT_VIEW);
  const [recordClick] = useMutation<any>(RECORD_PRODUCT_CLICK);
  const { data, loading, error } = useQuery<any>(PUBLIC_PRODUCT, {
    variables: { id: productId },
    skip: !productId,
    fetchPolicy: 'cache-first',
  });

  // Forward-only engagement tracking: a view (+ product click) each time the
  // detail opens for a product; a per-variant click when a variant is picked.
  useEffect(() => {
    if (!productId) return;
    recordView({ variables: { id: productId } }).catch(() => {});
    recordClick({ variables: { id: productId } }).catch(() => {});
  }, [productId, recordView, recordClick]);

  const pickVariant = (id: string) => {
    setVariantId(id);
    if (productId) recordClick({ variables: { id: productId, variant_id: id } }).catch(() => {});
  };
  const product = data?.publicInventoryProduct;
  const variants: any[] = product?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
  const { images, specs } = deriveProductMedia(product, selectedVariant);
  const description = product?.description || product?.short_description || '';
  const price = selectedVariant?.unit_cost ?? product?.unit_cost ?? 0;
  const mrp = product?.selling_price ?? 0;
  const brandId = product?.brand_id ?? null;
  // The pod cap (stocked − sold) bounds every purchase; a variant is further
  // bounded by its own stock.
  const stock = selectedVariant
    ? Math.min(Number(selectedVariant.inventory_count ?? 0), maxQuantity)
    : maxQuantity;
  const activePick: VariantPick | null = selectedVariant
    ? {
        id: selectedVariant.id,
        label:
          selectedVariant.option_label || selectedVariant.color || selectedVariant.size_label || 'Variant',
        unit_cost: Number(selectedVariant.unit_cost ?? product?.unit_cost ?? 0),
        image_url: selectedVariant.images?.[0] ?? product?.image_url ?? '',
        max: stock,
      }
    : null;
  const lineQuantity = productId
    ? (selection?.[selectionKey(productId, activePick?.id ?? null)] ?? 0)
    : 0;

  let body: React.ReactNode = null;
  if (loading) {
    body = (
      <Stack
        data-testid="product-detail-loading"
        sx={{
          alignItems: "center",
          py: 4
        }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} size={26} />
      </Stack>
    );
  } else if (error) {
    body = (
      <Alert severity="error" data-testid="product-detail-error">
        {error.message}
      </Alert>
    );
  } else if (product) {
    body = (
      <ProductDetailBody
        product={product}
        images={images}
        specs={specs}
        price={price}
        mrp={mrp}
        variants={variants}
        selectedVariantId={selectedVariant?.id}
        onPickVariant={pickVariant}
        brandId={brandId}
        onOpenBrand={setBrandOpen}
        description={description}
        onZoom={setZoomIndex}
      />
    );
  }

  return (
    <>
      <Dialog
        open={Boolean(productId)}
        onClose={onClose}
        fullScreen
        data-testid="product-detail-dialog"
        aria-labelledby="product-detail-dialog-title"
      >
        <DialogTitle
          id="product-detail-dialog-title-row"
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span id="product-detail-dialog-title">Product details</span>
          <DuncitIconButton
            aria-label={t('mweb.common.close')}
            onClick={onClose}
            size="small"
            data-testid="product-detail-close"
          >
            <CloseIcon />
          </DuncitIconButton>
        </DialogTitle>
        <DialogContent>{body}</DialogContent>
        {product && !viewOnly && onUpdateLine ? (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <ProductQuantityBar
              quantity={lineQuantity}
              maxQuantity={stock}
              onUpdate={(next) => onUpdateLine(next, activePick)}
            />
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
