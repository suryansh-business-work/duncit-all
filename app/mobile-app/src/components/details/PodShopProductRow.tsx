import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail } from '@/hooks/useDetails';

type Product = PodDetail['product_requests'][number];

const MUTED_ICON = '#9aa0a6';

/** A round +/- stepper button; disabled state greys out and drops the handler. */
function StepButton({
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

/** A selectable product row — checkbox to include, +/- steppers when picked,
 * quantity clamped to the available stock. */
export function PodShopProductRow({
  product,
  quantity,
  primary,
  onUpdate,
}: Readonly<{
  product: Product;
  quantity: number;
  primary: string;
  onUpdate: (productId: string, quantity: number) => void;
}>) {
  const image = product.image_url || product.images?.[0] || '';
  const maxQuantity = Number(product.available_count ?? product.quantity ?? 0);
  const selected = quantity > 0;
  const atMax = quantity >= maxQuantity;
  const lineTotal = Number(product.unit_cost ?? 0) * Math.max(quantity, 1);
  return (
    <XStack
      testID={`pod-shop-row-${product.product_id}`}
      role="button"
      aria-label={`Select ${product.product_name}`}
      aria-checked={selected}
      onPress={() => onUpdate(product.product_id, selected ? 0 : 1)}
      gap={10}
      alignItems="center"
      padding={10}
      borderRadius={14}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor="$surface"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons
        name={selected ? 'check-box' : 'check-box-outline-blank'}
        size={22}
        color={selected ? primary : MUTED_ICON}
      />
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
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="800" color="$color">
          {product.product_name}
        </Text>
        <Text fontSize={12} color="$muted">
          Available {maxQuantity}
        </Text>
        {selected ? (
          <XStack alignItems="center" gap={12} marginTop={6}>
            <StepButton
              testID={`pod-shop-dec-${product.product_id}`}
              icon="remove"
              color={primary}
              onPress={() => onUpdate(product.product_id, quantity - 1)}
            />
            <Text
              testID={`pod-shop-qty-${product.product_id}`}
              fontSize={14}
              fontWeight="900"
              color="$color"
            >
              {quantity}
            </Text>
            <StepButton
              testID={`pod-shop-inc-${product.product_id}`}
              icon="add"
              color={atMax ? MUTED_ICON : primary}
              disabled={atMax}
              onPress={() => onUpdate(product.product_id, Math.min(maxQuantity, quantity + 1))}
            />
          </XStack>
        ) : null}
      </YStack>
      <Text fontSize={14} fontWeight="900" color="$color">
        +₹{lineTotal}
      </Text>
    </XStack>
  );
}
