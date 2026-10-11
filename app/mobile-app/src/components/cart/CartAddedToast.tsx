import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { isCartFlowRoute } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { navigationRef } from '@/navigation/navigationRef';
import { selectCartCount, useCartStore } from '@/stores/cart.store';

/** How long the toast stays up — the same as mWeb's snackbar. */
const TOAST_MS = 4000;

/** Whether the screen on top is the cart or a checkout, which already show it. */
const onCartFlow = (): boolean =>
  navigationRef.isReady() && isCartFlowRoute(navigationRef.getCurrentRoute()?.name ?? '');

function CartAddedToastContent() {
  const { t } = useTranslation();
  const { success } = useThemeColors();
  const bottom = useBottomNavSpace(8);
  const count = useCartStore(selectCartCount);
  const hydrated = useCartStore((s) => s.hydrated);
  const previous = useRef({ count, hydrated });
  // Counts the adds: each one restarts the timer on the ONE toast, never stacks.
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState(false);
  const message = t('mweb.cart.addedToast');

  useEffect(() => {
    // The saved cart being restored at launch is not the buyer adding anything.
    const added = previous.current.hydrated && count > previous.current.count;
    previous.current = { count, hydrated };
    if (!added || onCartFlow()) return;
    setOpen(true);
    setShown((value) => value + 1);
    AccessibilityInfo.announceForAccessibility(message);
    // Only a change in the count speaks — not a new `t`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, hydrated]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => setOpen(false), TOAST_MS);
    return () => clearTimeout(timer);
  }, [open, shown]);

  if (!open) return null;
  return (
    <XStack
      testID="cart-added-toast"
      position="absolute"
      left={16}
      right={16}
      bottom={bottom}
      alignItems="center"
      gap={12}
      paddingVertical={10}
      paddingHorizontal={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <MaterialIcons name="check-circle" size={20} color={success} />
      <Text flex={1} fontSize={14} fontWeight="600" color="$color">
        {message}
      </Text>
      <DuncitButton
        testID="cart-added-toast-action"
        label={t('mweb.cart.addedToastAction')}
        variant="soft"
        size="sm"
        onPress={() => {
          setOpen(false);
          if (navigationRef.isReady()) navigationRef.navigate('Home', { screen: 'Cart' });
        }}
      />
    </XStack>
  );
}

/**
 * "Added to your cart" — one toast, with a way to the cart, every time the
 * cart's unit count goes up. Watching the count rather than each button covers
 * every way in at once (the shop's quick-add, a pod shop's stepper, the product
 * screen, a wishlist move) and stays silent on a failed add or a decrement,
 * which never raise it. Mounted at the app root, above every navigator, because
 * the shop, a pod and a product are pushed screens that cover the tab bar. Its
 * own boundary — a fault here must never take the app down. Twin of mWeb's
 * components/cart/CartAddedToast.
 */
export function CartAddedToast() {
  return (
    <ErrorBoundary>
      <CartAddedToastContent />
    </ErrorBoundary>
  );
}
