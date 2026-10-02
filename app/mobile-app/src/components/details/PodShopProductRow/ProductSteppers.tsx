import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The spoken name of each icon-only stepper button. */
const STEP_LABEL_KEY = { add: 'podProduct.increaseQty', remove: 'podProduct.decreaseQty' } as const;

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
  const { t } = useTranslation();
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-label={t(STEP_LABEL_KEY[icon])}
      aria-disabled={disabled}
      hitSlop={7}
      onPress={disabled ? undefined : onPress}
      alignItems="center"
      justifyContent="center"
      width={30}
      height={30}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      opacity={disabled ? 0.5 : 1}
      pressStyle={PRESS_STYLE.row}
    >
      <MaterialIcons name={icon} size={18} color={color} />
    </XStack>
  );
}

/** +/- steppers for a picked product; the + stops at the available stock. */
export function QuantityStepper({
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
  const { muted } = useThemeColors();
  const atMax = quantity >= maxQuantity;
  return (
    <XStack alignItems="center" gap={12} marginTop={6}>
      <StepButton
        testID={`pod-shop-dec-${productId}`}
        icon="remove"
        color={primary}
        onPress={() => onUpdate(productId, quantity - 1)}
      />
      <Text testID={`pod-shop-qty-${productId}`} fontSize={14} fontWeight="700" color="$color">
        {quantity}
      </Text>
      <StepButton
        testID={`pod-shop-inc-${productId}`}
        icon="add"
        color={atMax ? muted : primary}
        disabled={atMax}
        onPress={() => onUpdate(productId, Math.min(maxQuantity, quantity + 1))}
      />
    </XStack>
  );
}
