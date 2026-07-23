import type { ReactNode } from 'react';

import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PodDetail } from '@/hooks/useDetails';

type Product = PodDetail['product_requests'][number];

const MUTED_ICON = '#9aa0a6';

/** A round +/- stepper button; disabled state greys out and drops the handler. */
export function StepButton({
  testID,
  icon,
  color,
  disabled,
  onPress,
}: Readonly<{
  testID: string;
  icon: 'add' | 'remove';
  color: string;
  disabled?: boolean;
  onPress: () => void;
}>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      alignItems="center"
      justifyContent="center"
      width={30}
      height={30}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      opacity={disabled ? 0.5 : 1}
      pressStyle={{ opacity: 0.7 }}
    >
      <MaterialIcons name={icon} size={18} color={color} />
    </XStack>
  );
}

/** The row shell — a plain container; the in-cart state shows via the border. */
function ProductRowShell({
  testID,
  selected,
  children,
}: Readonly<{
  testID: string;
  selected: boolean;
  children: ReactNode;
}>) {
  return (
    <XStack
      testID={testID}
      gap={10}
      alignItems="center"
      padding={10}
      borderRadius={14}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor="$surface"
    >
      {children}
    </XStack>
  );
}

/** The add-to-cart CTA shown while the product has no line in the cart yet. */
function AddToCartButton({
  productId,
  productName,
  onAdd,
}: Readonly<{
  productId: string;
  productName: Product['product_name'];
  onAdd: () => void;
}>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      testID={`pod-shop-add-${productId}`}
      role="button"
      aria-label={`Add ${productName} to cart`}
      onPress={onAdd}
      gap={6}
      alignItems="center"
      alignSelf="flex-start"
      marginTop={6}
      paddingHorizontal={12}
      height={32}
      borderRadius={999}
      backgroundColor="$primary"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name="add-shopping-cart" size={15} color={onPrimary} />
      <Text fontSize={12.5} fontWeight="900" color={onPrimary}>
        Add to cart
      </Text>
    </XStack>
  );
}

/** Product thumbnail; falls back to a bag icon when the product has no image. */
function ProductThumb({ image }: Readonly<{ image: string }>) {
  return (
    <YStack
      width={48}
      height={48}
      borderRadius={10}
      overflow="hidden"
      backgroundColor="rgba(255,139,95,0.18)"
      alignItems="center"
      justifyContent="center"
    >
      {image ? (
        <AppImage source={{ uri: image }} style={{ width: 48, height: 48 }} resizeMode="cover" />
      ) : (
        <MaterialIcons name="shopping-bag" size={20} color="#ff8b5f" />
      )}
    </YStack>
  );
}

/** +/- steppers for a picked product; the + stops at the available stock. */
function QuantityStepper({
  productId,
  quantity,
  maxQuantity,
  primary,
  onUpdate,
}: Readonly<{
  productId: string;
  quantity: number;
  maxQuantity: number;
  primary: string;
  onUpdate: (productId: string, quantity: number) => void;
}>) {
  const atMax = quantity >= maxQuantity;
  return (
    <XStack alignItems="center" gap={12} marginTop={6}>
      <StepButton
        testID={`pod-shop-dec-${productId}`}
        icon="remove"
        color={primary}
        onPress={() => onUpdate(productId, quantity - 1)}
      />
      <Text testID={`pod-shop-qty-${productId}`} fontSize={14} fontWeight="900" color="$color">
        {quantity}
      </Text>
      <StepButton
        testID={`pod-shop-inc-${productId}`}
        icon="add"
        color={atMax ? MUTED_ICON : primary}
        disabled={atMax}
        onPress={() => onUpdate(productId, Math.min(maxQuantity, quantity + 1))}
      />
    </XStack>
  );
}

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
        <Text fontSize={14} fontWeight="800" color="$color">
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
        aria-label={`View ${product.product_name} details`}
        onPress={() => onInfo(product.product_id)}
        width={30}
        height={30}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        pressStyle={{ opacity: 0.6 }}
      >
        <MaterialIcons name="info-outline" size={18} color={MUTED_ICON} />
      </XStack>
      <Text fontSize={14} fontWeight="900" color="$color">
        {priceLabel}
      </Text>
    </ProductRowShell>
  );
}
