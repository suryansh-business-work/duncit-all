import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PodShopProductRow } from './PodShopProductRow';
import { ProductDetailSheet, type VariantPick } from './ProductDetailSheet';

interface PodShopProps {
  pod: PodDetail;
  selectedProducts: Record<string, number>;
  onSelectionChange: (next: Record<string, number>) => void;
  /** Variant-aware total for this pod's selection (base + variant lines). */
  selectedTotal?: number;
  /** A variant line change from the detail sheet (row + picked variant + qty). */
  onVariantQuantity?: (row: any, variant: VariantPick, quantity: number) => void;
  /** View-only once the viewer has already booked this pod (no re-selecting). */
  readOnly?: boolean;
}

/** Footer caption: neutral when nothing is picked, else the count of picks. */
function productCountLabel(count: number): string {
  if (count === 0) return 'Selected product total';
  return `${count} product${count === 1 ? '' : 's'} selected`;
}

/** Pod Shop — lists the pod's real products with buyer selection (checkbox +
 * quantity steppers) tracked as a `{ productId: qty }` map, plus a running
 * selected-total. RN port of mWeb's PodCommercePreview; only real products, no
 * perks/placeholder data. */
export function PodShop({
  pod,
  selectedProducts,
  onSelectionChange,
  selectedTotal,
  onVariantQuantity,
  readOnly = false,
}: Readonly<PodShopProps>) {
  const { primary } = useThemeColors();
  const [infoProductId, setInfoProductId] = useState<string | null>(null);
  const products = pod.product_requests ?? [];
  const baseTotal = products.reduce(
    (sum, item) => sum + (selectedProducts[item.product_id] ?? 0) * Number(item.unit_cost ?? 0),
    0,
  );
  // The variant-aware total from the cart wins when provided.
  const shownTotal = selectedTotal ?? baseTotal;
  const selectedCount = Object.values(selectedProducts).filter((qty) => qty > 0).length;

  const updateQuantity = (productId: string, quantity: number) => {
    const next = { ...selectedProducts };
    if (quantity <= 0) delete next[productId];
    else next[productId] = quantity;
    onSelectionChange(next);
  };

  const infoProduct = products.find((item) => item.product_id === infoProductId);
  const infoMax = Number(infoProduct?.available_count ?? infoProduct?.quantity ?? 0);
  const onUpdateInfoLine = infoProductId
    ? (quantity: number, variant: VariantPick | null) => {
        if (variant && onVariantQuantity && infoProduct) {
          onVariantQuantity(infoProduct, variant, quantity);
          return;
        }
        updateQuantity(infoProductId, quantity);
      }
    : undefined;

  return (
    <YStack
      margin={16}
      padding={16}
      gap={14}
      borderRadius={18}
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
      testID="pod-shop"
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack gap={8} alignItems="center">
          <MaterialIcons name="storefront" size={22} color="#ff8b5f" />
          <YStack>
            <Text fontSize={11} fontWeight="800" color="$muted" letterSpacing={0.4}>
              POD SHOP
            </Text>
            <Text fontSize={16} fontWeight="900" color="$color">
              Products
            </Text>
          </YStack>
        </XStack>
        <XStack
          paddingHorizontal={10}
          paddingVertical={5}
          borderRadius={999}
          backgroundColor="$surface"
        >
          <Text fontSize={12} fontWeight="800" color="$color">
            {pod.products_enabled ? 'Available' : 'Closed'}
          </Text>
        </XStack>
      </XStack>

      {products.length === 0 ? (
        <XStack gap={8} alignItems="center" testID="pod-shop-empty">
          <MaterialIcons name="info-outline" size={16} color={primary} />
          <Text fontSize={13.5} color="$muted">
            No products available yet.
          </Text>
        </XStack>
      ) : (
        <YStack gap={8}>
          {products.map((product) => (
            <PodShopProductRow
              key={product.product_id}
              product={product}
              quantity={selectedProducts[product.product_id] ?? 0}
              primary={primary}
              onUpdate={updateQuantity}
              onInfo={setInfoProductId}
              readOnly={readOnly}
            />
          ))}
        </YStack>
      )}

      {products.length > 0 && readOnly ? (
        <Text testID="pod-shop-booked-note" fontSize={12.5} color="$muted">
          {'You’ve already booked this pod.'}
        </Text>
      ) : null}
      {products.length > 0 && !readOnly ? (
        <XStack justifyContent="space-between" alignItems="center" testID="pod-shop-total">
          <Text fontSize={12} color="$muted">
            {productCountLabel(selectedCount)}
          </Text>
          <Text fontSize={15} fontWeight="900" color="$color">
            ₹{shownTotal}
          </Text>
        </XStack>
      ) : null}

      <ProductDetailSheet
        productId={infoProductId}
        onClose={() => setInfoProductId(null)}
        selection={selectedProducts}
        maxQuantity={infoMax}
        readOnly={readOnly}
        onUpdateLine={onUpdateInfoLine}
      />
    </YStack>
  );
}
