import { useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { BrandDetailSheet } from '@/components/details/BrandDetailSheet';
import { ZoomableImageModal } from '@/components/details/ZoomableImageModal';
import {
  PublicInventoryProductDocument,
  RecordProductClickDocument,
  RecordProductViewDocument,
} from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toErrorMessage } from '@/utils/errors';
import { selectionKey } from '@/utils/product-selection';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import { ProductBody } from './ProductBody';
import { productImages, variantLabel, type Product, type VariantPick } from './types';

interface Props {
  productId: string | null;
  onClose: () => void;
  /** The pod's selection map (composite keys) — the sheet reads its own line. */
  selection?: Record<string, number>;
  /** Pod-level stock cap (stocked − sold) — bounds every variant of this product. */
  maxQuantity?: number;
  /** Update the active line (base or picked variant); 0 removes it. */
  onUpdateLine?: (quantity: number, variant: VariantPick | null) => void;
  /** View-only once the viewer has already booked this pod (no re-selecting). */
  readOnly?: boolean;
}

/** Product-detail sheet opened from the Pod Shop info icon — laid out like
 * mWeb's product page (round back button, gallery, name, price, pills,
 * description card, bottom buy bar), fetched on demand for any signed-in user
 * (RN twin of mWeb's ProductDetailDialog / ProductDetailPage). */
export function ProductDetailSheet({
  productId,
  onClose,
  selection,
  maxQuantity = 0,
  onUpdateLine,
  readOnly,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, color } = useThemeColors();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [brandOpen, setBrandOpen] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setIsLoading(true);
    setError('');
    setProduct(null);
    setVariantId(null);
    graphqlRequest(PublicInventoryProductDocument, { productDocId: productId }, { auth: true })
      .then((data) => active && setProduct(data.publicInventoryProduct ?? null))
      .catch((e) => active && setError(toErrorMessage(e, 'Could not load product.')))
      .finally(() => active && setIsLoading(false));
    // Forward-only engagement tracking: a view + product click each time the
    // detail opens (mirrors the mWeb pod-shop product dialog, rule 27).
    fireAndForget(
      graphqlRequest(RecordProductViewDocument, { productDocId: productId }, { auth: true }),
    );
    fireAndForget(
      graphqlRequest(
        RecordProductClickDocument,
        { productDocId: productId, variantId: null },
        { auth: true },
      ),
    );
    return () => {
      active = false;
    };
  }, [productId, attempt]);

  useRefreshRegistration(refetch);

  const pickVariant = (id: string) => {
    setVariantId(id);
    fireAndForget(
      graphqlRequest(
        RecordProductClickDocument,
        { productDocId: productId as string, variantId: id },
        { auth: true },
      ),
    );
  };

  const variants = product?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
  const images = productImages(product, selectedVariant);
  const price = selectedVariant?.unit_cost ?? product?.unit_cost ?? 0;
  const mrp = product?.selling_price ?? 0;
  const hasMrp = mrp > price;
  // Non-empty only when the product carries a brand link → the brand is tappable.
  const brandId = product?.brand_id ?? null;
  // The pod cap (stocked − sold) bounds every purchase; a variant is further
  // bounded by its own stock.
  const stock = selectedVariant
    ? Math.min(Number(selectedVariant.inventory_count ?? 0), maxQuantity)
    : maxQuantity;
  const activePick: VariantPick | null = selectedVariant
    ? {
        id: selectedVariant.id,
        label: variantLabel(selectedVariant),
        unit_cost: Number(selectedVariant.unit_cost ?? product?.unit_cost ?? 0),
        image_url: selectedVariant.images?.[0] ?? product?.image_url ?? '',
        max: stock,
      }
    : null;
  const lineQuantity = productId
    ? (selection?.[selectionKey(productId, activePick?.id ?? null)] ?? 0)
    : 0;

  // Body variants hoisted to consts so the render tree keeps flat (non-nested)
  // ternaries — identical branches, same scope.
  const loadedBody = error ? (
    <Text testID="product-detail-error" padding={24} color="$danger">
      {error}
    </Text>
  ) : (
    <ProductBody
      product={product}
      variants={variants}
      selectedVariantId={selectedVariant?.id ?? null}
      onSelectVariant={pickVariant}
      images={images}
      price={price}
      mrp={mrp}
      hasMrp={hasMrp}
      brandId={brandId}
      selectedVariant={selectedVariant}
      quantity={lineQuantity}
      maxQuantity={stock}
      primary={primary}
      readOnly={readOnly}
      onUpdateQuantity={onUpdateLine ? (next) => onUpdateLine(next, activePick) : undefined}
      onZoom={setZoomIndex}
      onOpenBrand={setBrandOpen}
    />
  );

  return (
    <Modal visible={!!productId} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} backgroundColor="$background" testID="product-detail-sheet">
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              <XStack paddingHorizontal={16} paddingVertical={8}>
                <XStack
                  pressStyle={PRESS_STYLE.row}
                  testID="product-detail-close"
                  role="button"
                  aria-label={t('mweb.common.close')}
                  onPress={onClose}
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={20}
                  borderWidth={1}
                  borderColor="$cardBorder"
                  backgroundColor="$surface"
                >
                  <MaterialIcons name="arrow-back" size={20} color={color} />
                </XStack>
              </XStack>

              {isLoading ? (
                <YStack padding={32} alignItems="center">
                  <Spinner testID="product-detail-loading" color="$primary" />
                </YStack>
              ) : (
                loadedBody
              )}
            </SafeAreaView>
          </YStack>
        </KeyboardScreen>
        <ZoomableImageModal images={images} index={zoomIndex} onClose={() => setZoomIndex(null)} />
        <BrandDetailSheet brandId={brandOpen} onClose={() => setBrandOpen(null)} />
      </ModalThemeScope>
    </Modal>
  );
}
