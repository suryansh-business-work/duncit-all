import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** Small tonal "Free delivery" pill shown against a cart/summary line whose
 * subtotal reaches the product's free-delivery threshold. The shipping quote's
 * `free` flag stays authoritative per warehouse group — this is a preview hint
 * only. mWeb twin: components/cart/FreeDeliveryChip. */
export function FreeDeliveryBadge({ testID }: Readonly<{ testID: string }>) {
  const { success } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack
      testID={testID}
      gap={4}
      alignItems="center"
      alignSelf="flex-start"
      height={22}
      paddingHorizontal={8}
      borderRadius={999}
      backgroundColor="$successSoft"
    >
      <MaterialIcons name="local-shipping" size={12} color={success} />
      <Text fontSize={11} fontWeight="600" color="$success">
        {t('mweb.cart.freeDelivery')}
      </Text>
    </XStack>
  );
}
