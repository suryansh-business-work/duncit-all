import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AddToCartButton, ProductRowShell, ProductThumb, type Product } from './ProductRowParts';
import { QuantityStepper } from './ProductSteppers';

/** A product row — an explicit "Add to cart" button, then +/- steppers once the
 * product is in the cart (no checkbox / no whole-card toggle), quantity clamped
 * to the available stock. */
export function PodShopProductRow({
  product,
  quantity,
  primary,
  onUpdate,
  onInfo,
  readOnly,
}: Readonly<{
  product: Product;
  quantity: number;
  primary: string;
  onUpdate: (productId: string, quantity: number) => void;
  onInfo: (productId: string) => void;
  readOnly?: boolean;
}>) {
  const { muted } = useThemeColors();
  const image = product.image_url || product.images?.[0] || '';
  const maxQuantity = Number(product.available_count ?? product.quantity ?? 0);
  // Members can only view products — never select them (avoids a re-charge).
  const selected = !readOnly && quantity > 0;
  const unitCost = Number(product.unit_cost ?? 0);
  const lineTotal = unitCost * quantity;
  const priceLabel = selected ? `+₹${lineTotal}` : `₹${unitCost}`;
  const canAdd = !readOnly && quantity === 0 && maxQuantity > 0;
  return (
    <ProductRowShell testID={`pod-shop-row-${product.product_id}`} selected={selected}>
      <ProductThumb image={image} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {product.product_name}
        </Text>
        <Text fontSize={12} color="$muted">
          Available {maxQuantity}
        </Text>
        {canAdd ? (
          <AddToCartButton
            productId={product.product_id}
            productName={product.product_name}
            onAdd={() => onUpdate(product.product_id, 1)}
          />
        ) : null}
        {selected ? (
          <QuantityStepper
            productId={product.product_id}
            quantity={quantity}
            maxQuantity={maxQuantity}
            primary={primary}
            onUpdate={onUpdate}
          />
        ) : null}
      </YStack>
      <XStack
        testID={`pod-shop-info-${product.product_id}`}
        role="button"
        tabIndex={0}
        aria-label={`View ${product.product_name} details`}
        hitSlop={7}
        onPress={() => onInfo(product.product_id)}
        width={30}
        height={30}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        pressStyle={PRESS_STYLE.inline}
      >
        <MaterialIcons name="info-outline" size={18} color={muted} />
      </XStack>
      <Text fontSize={14} fontWeight="700" color="$color">
        {priceLabel}
      </Text>
    </ProductRowShell>
  );
}
