import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  clampPodProductQty,
  podProductLineTotal,
  podProductStock,
  type PodPickerProduct,
} from '@duncit/utils';

interface Props {
  product: PodPickerProduct | null;
  quantity: number;
  onQuantityChange: (next: number) => void;
  onAdd: () => void;
  /** Set when the host pressed Add with nothing picked. */
  error: string;
}

const stepperBox = {
  width: 36,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '$borderColor',
  pressStyle: { opacity: 0.7 },
} as const;

/**
 * The picker's sticky footer: quantity and the Add action.
 *
 * Nothing picked → both stepper buttons are inert and the hint says why. That is
 * the whole selection gate, in one place, so the quantity can never be set for a
 * product that was never chosen. mWeb twin (SelectionPanel).
 */
export function ProductQuantityBar({
  product,
  quantity,
  onQuantityChange,
  onAdd,
  error,
}: Readonly<Props>) {
  const { color, muted } = useThemeColors();
  const { t } = useTranslation();
  const stock = podProductStock(product);
  const atMax = stock > 0 && quantity >= stock;
  const step = (delta: number) => onQuantityChange(clampPodProductQty(quantity + delta, product));
  const canDecrease = !!product && quantity > 1;
  const canIncrease = !!product && !atMax;

  return (
    <YStack
      gap={10}
      padding={14}
      borderTopWidth={1}
      borderTopColor="$borderColor"
      backgroundColor="$background"
    >
      {product ? (
        <XStack alignItems="center" justifyContent="space-between" gap={8}>
          <Text
            testID="product-picked-name"
            fontSize={13.5}
            fontWeight="700"
            color="$color"
            flex={1}
            numberOfLines={1}
          >
            {product.product_name}
          </Text>
          <Text fontSize={13} fontWeight="700" color="$primary">
            {t('podProduct.lineTotal', {
              vars: { amount: `₹${podProductLineTotal(product, quantity)}` },
            })}
          </Text>
        </XStack>
      ) : (
        <Text testID="product-quantity-hint" fontSize={12.5} color="$muted">
          {t('podProduct.quantityHint')}
        </Text>
      )}

      <XStack alignItems="center" gap={10}>
        <Text fontSize={13} color={product ? '$color' : '$muted'}>
          {t('podProduct.quantity')}
        </Text>
        <XStack
          testID="product-qty-dec"
          role="button"
          aria-label={t('podProduct.decreaseQty')}
          aria-disabled={!canDecrease}
          onPress={canDecrease ? () => step(-1) : undefined}
          opacity={canDecrease ? 1 : 0.4}
          {...stepperBox}
        >
          <MaterialIcons name="remove" size={18} color={color} />
        </XStack>
        <Text
          testID="product-qty"
          fontSize={15}
          fontWeight="700"
          color={product ? '$color' : '$muted'}
          minWidth={28}
          textAlign="center"
        >
          {quantity}
        </Text>
        <XStack
          testID="product-qty-inc"
          role="button"
          aria-label={t('podProduct.increaseQty')}
          aria-disabled={!canIncrease}
          onPress={canIncrease ? () => step(1) : undefined}
          opacity={canIncrease ? 1 : 0.4}
          {...stepperBox}
        >
          <MaterialIcons name="add" size={18} color={color} />
        </XStack>
        <XStack flex={1} />
        {product && atMax ? (
          <Text fontSize={11.5} color="$muted">
            {t('podProduct.maxQtyHint', { vars: { count: stock } })}
          </Text>
        ) : null}
      </XStack>

      {error ? (
        <Text testID="product-picker-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}

      {/* Deliberately always pressable. Adding is still refused without a pick —
          the parent's onAdd is a no-op — but an inert button swallows the press
          and the flow requires that attempting to continue with no selection
          SAYS so. */}
      <XStack
        testID="product-add-to-pod"
        role="button"
        aria-label={t('podProduct.addToPod')}
        onPress={onAdd}
        height={46}
        borderRadius={12}
        alignItems="center"
        justifyContent="center"
        backgroundColor={product ? '$primary' : muted}
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14.5} fontWeight="700" color="$onPrimary">
          {t('podProduct.addToPod')}
        </Text>
      </XStack>
    </YStack>
  );
}
