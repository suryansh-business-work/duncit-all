import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { selectCartCount, useCartStore } from '@/stores/cart.store';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/** Screens where the floating button would cover its own flow. */
const HIDDEN_ON = new Set(['Cart', 'Checkout']);

/** Floating cart entry point — visible whenever the cart has items (hidden on
 * the cart/checkout screens themselves). RN twin of mWeb's FloatingCartButton. */
export function FloatingCartButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const routeName = useNavigationState((state) => state?.routes[state.index]?.name);
  const totalCount = useCartStore(selectCartCount);
  const { onPrimary } = useThemeColors();

  if (totalCount === 0 || HIDDEN_ON.has(routeName ?? '')) return null;

  return (
    <XStack
      testID="floating-cart-button"
      role="button"
      aria-label={`Open cart (${totalCount} items)`}
      onPress={() => navigation.navigate('Cart')}
      position="absolute"
      right={16}
      bottom={96}
      width={56}
      height={56}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      backgroundColor="$primary"
      elevation={6}
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name="shopping-cart" size={26} color={onPrimary} />
      <YStack
        position="absolute"
        top={-4}
        right={-4}
        minWidth={20}
        height={20}
        paddingHorizontal={4}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$danger"
      >
        <Text fontSize={11} fontWeight="900" color="#ffffff" testID="floating-cart-count">
          {totalCount > 99 ? '99+' : totalCount}
        </Text>
      </YStack>
    </XStack>
  );
}
