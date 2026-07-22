import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { navigationRef } from '@/navigation/navigationRef';
import { selectCartCount, useCartStore } from '@/stores/cart.store';
import { useThemeColors } from '@/hooks/useThemeColors';

/** Screens where the floating button would cover its own flow. */
const HIDDEN_ON = new Set(['Cart', 'Checkout']);

/** Floating cart entry point — visible whenever the cart has items (hidden on
 * the cart/checkout screens themselves). RN twin of mWeb's FloatingCartButton. */
export function FloatingCartButton() {
  const totalCount = useCartStore(selectCartCount);
  const { onPrimary } = useThemeColors();
  const [routeName, setRouteName] = useState<string>();

  // The button lives OUTSIDE the navigator (sibling of RootNavigator), so it
  // reads the active route through the container ref and re-syncs on every
  // navigation state change — which is what hides it on Cart/Checkout.
  useEffect(() => {
    const sync = () => setRouteName(navigationRef.getCurrentRoute()?.name);
    sync();
    return navigationRef.addListener('state', sync);
  }, []);

  if (totalCount === 0 || HIDDEN_ON.has(routeName ?? '')) return null;

  return (
    <XStack
      testID="floating-cart-button"
      role="button"
      aria-label={`Open cart (${totalCount} items)`}
      onPress={() => navigationRef.navigate('Cart')}
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
