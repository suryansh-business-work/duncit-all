import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

interface Props {
  count: number;
  tint: string;
  onPress: () => void;
}

/** Non-floating cart button for the Pod Shop header (the floating cart is hidden
 * on this screen). Badge shows the cart's unit count. RN twin of mWeb's
 * ShopHeaderCart. */
export function ShopHeaderCart({ count, tint, onPress }: Readonly<Props>) {
  return (
    <XStack
      testID="shop-header-cart"
      role="button"
      aria-label={`Open cart (${count} items)`}
      onPress={onPress}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={20}
      pressStyle={{ opacity: 0.7 }}
    >
      <MaterialIcons name="shopping-cart" size={22} color={tint} />
      {count > 0 ? (
        <YStack
          testID="shop-header-cart-count"
          position="absolute"
          top={0}
          right={0}
          minWidth={16}
          height={16}
          paddingHorizontal={3}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$danger"
        >
          <Text fontSize={9} fontWeight="900" color="#ffffff">
            {count > 99 ? '99+' : count}
          </Text>
        </YStack>
      ) : null}
    </XStack>
  );
}
