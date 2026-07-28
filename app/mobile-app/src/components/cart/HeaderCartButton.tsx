import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { deriveCartEntry } from '@duncit/utils';

import { navigationRef } from '@/navigation/navigationRef';
import { selectCartCount, useCartStore } from '@/stores/cart.store';
import { useThemeColors } from '@/hooks/useThemeColors';

/** The active screen's route name, or '' before the container has settled. */
function currentRouteName(): string {
  return (navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined) ?? '';
}

/**
 * The app's single cart entry point — it sits in the header (the tab header and
 * the stack back-bar) instead of floating over the content. Hidden while the
 * cart is empty and on the cart flow itself.
 *
 * RN twin of mWeb's HeaderCartButton: both read `deriveCartEntry` from
 * @duncit/utils, so the badge, the visibility rule and the accessible name
 * cannot drift apart (rule 27).
 */
export function HeaderCartButton() {
  const totalCount = useCartStore(selectCartCount);
  const { color: ink } = useThemeColors();
  const [routeName, setRouteName] = useState(currentRouteName);

  // The button reads the active route through the container ref rather than a
  // navigator hook, so it renders identically from the tab header and from a
  // stack back-bar, and re-syncs on every navigation state change.
  useEffect(() => {
    const sync = () => setRouteName(currentRouteName());
    sync();
    return navigationRef.addListener('state', sync);
  }, []);

  const entry = deriveCartEntry(totalCount, routeName);
  if (!entry.visible) return null;

  return (
    <XStack
      testID="header-cart"
      role="button"
      aria-label={entry.label}
      onPress={() => navigationRef.navigate('Cart')}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={20}
      pressStyle={{ opacity: 0.7 }}
    >
      <MaterialIcons name="shopping-cart" size={22} color={ink} />
      <YStack
        testID="header-cart-count"
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
          {entry.badge}
        </Text>
      </YStack>
    </XStack>
  );
}
