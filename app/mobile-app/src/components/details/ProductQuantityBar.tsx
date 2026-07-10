import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { StepButton } from './PodShopProductRow';

const MUTED_ICON = '#9aa0a6';
const DANGER = '#e5484d';

interface Props {
  quantity: number;
  maxQuantity: number;
  primary: string;
  readOnly?: boolean;
  onUpdate?: (quantity: number) => void;
}

/** Product-sheet cart control: add the product to the selection, or adjust its
 * quantity (+/-) and remove it. Quantity is clamped to available stock. Renders
 * nothing when the pod is view-only (already booked) or no handler is wired. */
export function ProductQuantityBar({
  quantity,
  maxQuantity,
  primary,
  readOnly,
  onUpdate,
}: Readonly<Props>) {
  if (readOnly || !onUpdate) return null;

  const outOfStock = maxQuantity <= 0;
  if (quantity <= 0) {
    return (
      <XStack
        testID="product-detail-add"
        role="button"
        aria-disabled={outOfStock}
        aria-label="Add to selection"
        onPress={outOfStock ? undefined : () => onUpdate(1)}
        marginTop={4}
        paddingVertical={12}
        borderRadius={12}
        backgroundColor={outOfStock ? '$surface' : '$primary'}
        alignItems="center"
        justifyContent="center"
        gap={8}
        opacity={outOfStock ? 0.6 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons
          name="add-shopping-cart"
          size={18}
          color={outOfStock ? MUTED_ICON : '#fff'}
        />
        <Text fontSize={14} fontWeight="900" color={outOfStock ? '$muted' : '#fff'}>
          {outOfStock ? 'Out of stock' : 'Add to selection'}
        </Text>
      </XStack>
    );
  }

  const atMax = quantity >= maxQuantity;
  return (
    <XStack marginTop={4} alignItems="center" justifyContent="space-between">
      <XStack gap={14} alignItems="center">
        <StepButton
          testID="product-detail-dec"
          icon="remove"
          color={primary}
          onPress={() => onUpdate(quantity - 1)}
        />
        <Text testID="product-detail-qty" fontSize={16} fontWeight="900" color="$color">
          {quantity}
        </Text>
        <StepButton
          testID="product-detail-inc"
          icon="add"
          color={atMax ? MUTED_ICON : primary}
          disabled={atMax}
          onPress={() => onUpdate(Math.min(maxQuantity, quantity + 1))}
        />
      </XStack>
      <XStack
        testID="product-detail-remove"
        role="button"
        aria-label="Remove from selection"
        onPress={() => onUpdate(0)}
        gap={5}
        alignItems="center"
        paddingVertical={6}
        paddingHorizontal={10}
        borderRadius={999}
        pressStyle={{ opacity: 0.6 }}
      >
        <MaterialIcons name="delete-outline" size={18} color={DANGER} />
        <Text fontSize={13} fontWeight="800" color="$danger">
          Remove
        </Text>
      </XStack>
    </XStack>
  );
}
