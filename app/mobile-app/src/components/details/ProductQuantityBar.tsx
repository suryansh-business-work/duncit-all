import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { StepButton } from './PodShopProductRow';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  quantity: number;
  maxQuantity: number;
  primary: string;
  readOnly?: boolean;
  onUpdate?: (quantity: number) => void;
}

/** Nothing selected yet: a single "Add to selection" call to action, greyed out
 * and inert once the product is out of stock. */
function AddToSelection({
  outOfStock,
  onAdd,
}: Readonly<{ outOfStock: boolean; onAdd: () => void }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const iconColor = outOfStock ? muted : '#fff';
  const textColor = outOfStock ? '$muted' : '#fff';
  const label = outOfStock ? 'Out of stock' : 'Add to selection';
  return (
    <XStack
      testID="product-detail-add"
      role="button"
      aria-disabled={outOfStock}
      aria-label={t('mweb.details.addToSelection')}
      onPress={outOfStock ? undefined : onAdd}
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
      <MaterialIcons name="add-shopping-cart" size={18} color={iconColor} />
      <Text fontSize={14} fontWeight="700" color={textColor}>
        {label}
      </Text>
    </XStack>
  );
}

/** Already in the selection: step the quantity up to available stock, or remove. */
function QuantityStepper({
  quantity,
  maxQuantity,
  primary,
  onUpdate,
}: Readonly<{
  quantity: number;
  maxQuantity: number;
  primary: string;
  onUpdate: (quantity: number) => void;
}>) {
  const { t } = useTranslation();
  const { muted, danger } = useThemeColors();
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
        <Text testID="product-detail-qty" fontSize={16} fontWeight="700" color="$color">
          {quantity}
        </Text>
        <StepButton
          testID="product-detail-inc"
          icon="add"
          color={atMax ? muted : primary}
          disabled={atMax}
          onPress={() => onUpdate(Math.min(maxQuantity, quantity + 1))}
        />
      </XStack>
      <XStack
        testID="product-detail-remove"
        role="button"
        aria-label={t('mweb.details.removeFromSelection')}
        onPress={() => onUpdate(0)}
        gap={5}
        alignItems="center"
        paddingVertical={6}
        paddingHorizontal={10}
        borderRadius={999}
        pressStyle={{ opacity: 0.6 }}
      >
        <MaterialIcons name="delete-outline" size={18} color={danger} />
        <Text fontSize={13} fontWeight="600" color="$danger">
          Remove
        </Text>
      </XStack>
    </XStack>
  );
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
  if (quantity <= 0) {
    return <AddToSelection outOfStock={maxQuantity <= 0} onAdd={() => onUpdate(1)} />;
  }
  return (
    <QuantityStepper
      quantity={quantity}
      maxQuantity={maxQuantity}
      primary={primary}
      onUpdate={onUpdate}
    />
  );
}
