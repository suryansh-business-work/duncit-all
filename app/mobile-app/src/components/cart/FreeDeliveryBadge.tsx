import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

/** Small "Free delivery" chip shown against a cart/summary line whose subtotal
 * reaches the product's free-delivery threshold. The shipping quote's `free`
 * flag stays authoritative per warehouse group — this is a preview hint only. */
export function FreeDeliveryBadge({ testID }: Readonly<{ testID: string }>) {
  const { success } = useThemeColors();
  return (
    <XStack
      testID={testID}
      gap={3}
      alignItems="center"
      alignSelf="flex-start"
      paddingHorizontal={6}
      paddingVertical={2}
      borderRadius={999}
      borderWidth={1}
      borderColor="$success"
    >
      <MaterialIcons name="local-shipping" size={11} color={success} />
      <Text fontSize={10} fontWeight="800" color="$success">
        Free delivery
      </Text>
    </XStack>
  );
}
