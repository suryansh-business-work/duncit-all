import type { ReactNode } from 'react';

import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

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

/** The row shell — a checkbox that toggles the pick, inert when read-only. */
function ProductRowShell({
  testID,
  productName,
  selected,
  readOnly,
  onToggle,
  children,
}: Readonly<{
  testID: string;
  productName: Product['product_name'];
  selected: boolean;
  readOnly?: boolean;
  onToggle: () => void;
  children: ReactNode;
}>) {
  return (
    <XStack
      testID={testID}
      role={readOnly ? undefined : 'checkbox'}
      aria-label={readOnly ? undefined : `Select ${productName}`}
      aria-checked={readOnly ? undefined : selected}
      onPress={readOnly ? undefined : onToggle}
      gap={10}
      alignItems="center"
      padding={10}
      borderRadius={14}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor="$surface"
      pressStyle={readOnly ? undefined : { opacity: 0.85 }}
    >
      {children}
    </XStack>
  );
}

/** The include-in-order tick; hidden altogether on read-only rows. */
function SelectCheckbox({
  selected,
  primary,
}: Readonly<{
  selected: boolean;
  primary: string;
}>) {
  return (
    <MaterialIcons
      name={selected ? 'check-box' : 'check-box-outline-blank'}
      size={22}
      color={selected ? primary : MUTED_ICON}
    />
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

/** A selectable product row — checkbox to include, +/- steppers when picked,
 * quantity clamped to the available stock. */
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
  const lineTotal = Number(product.unit_cost ?? 0) * Math.max(quantity, 1);
  return (
    <ProductRowShell
      testID={`pod-shop-row-${product.product_id}`}
      productName={product.product_name}
      selected={selected}
      readOnly={readOnly}
      onToggle={() => onUpdate(product.product_id, selected ? 0 : 1)}
    >
      {readOnly ? null : <SelectCheckbox selected={selected} primary={primary} />}
      <ProductThumb image={image} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="800" color="$color">
          {product.product_name}
        </Text>
        <Text fontSize={12} color="$muted">
          Available {maxQuantity}
        </Text>
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
        +₹{lineTotal}
      </Text>
    </ProductRowShell>
  );
}
