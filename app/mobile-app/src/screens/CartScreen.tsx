import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { CartPodGroup } from '@/components/cart/CartPodGroup';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TabScreen } from '@/components/TabScreen';
import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useTranslation } from '@/hooks/useTranslation';
import { cartLineKey, groupLinesByPod, selectCartTotal, useCartStore } from '@/stores/cart.store';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** Room the pinned checkout bar takes above the bottom nav (button + gap). */
const CHECKOUT_BAR_SPACE = 76;

/** The cart — every product added from any Pod Shop, grouped by pod for
 * display, paid together as ONE product payment (delivery is still quoted per
 * warehouse at checkout). RN twin of mWeb's CartPage. */
export function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const checkoutLabel = t('mweb.cart.checkout');
  const clearLabel = t('mweb.cart.clear');
  const lines = useCartStore((s) => s.lines);
  const setLine = useCartStore((s) => s.setLine);
  const removeLine = useCartStore((s) => s.removeLine);
  const clearAll = useCartStore((s) => s.clearAll);
  const total = useCartStore(selectCartTotal);
  const bottomSpace = useBottomNavSpace();
  // The checkout bar floats just above the floating bottom nav.
  const barBottom = useBottomNavSpace(8);

  const groups = useMemo(() => groupLinesByPod(lines), [lines]);
  const hasItems = groups.length > 0;

  let body;
  if (hasItems) {
    body = (
      <YStack gap={16} padding={16}>
        {groups.map(([podId, group]) => (
          <CartPodGroup
            key={podId}
            podId={podId}
            podTitle={group.title}
            lines={group.lines}
            onSetQuantity={(line, quantity) => setLine(line, quantity)}
            onRemove={(line) => removeLine(podId, cartLineKey(line))}
          />
        ))}
        <SurfaceCard>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={14} color="$muted">
              {t('mweb.cart.total')}
            </Text>
            <Text testID="cart-total" fontSize={18} fontWeight="700" color="$color">
              ₹{total}
            </Text>
          </XStack>
        </SurfaceCard>
        <XStack
          testID="cart-clear"
          role="button"
          aria-label={clearLabel}
          onPress={clearAll}
          alignSelf="center"
          paddingHorizontal={16}
          paddingVertical={10}
          pressStyle={PRESS_STYLE.row}
        >
          <Text fontSize={14} fontWeight="600" color="$danger">
            {clearLabel}
          </Text>
        </XStack>
      </YStack>
    );
  } else {
    body = (
      <EmptyState
        testID="cart-empty"
        icon="shopping-cart"
        title={t('mweb.cart.empty')}
        actionLabel={t('mweb.cart.exploreShop')}
        onAction={() => navigation.navigate('Shop')}
        actionTestID="cart-explore-shop"
      />
    );
  }

  return (
    <TabScreen testID="cart-screen">
      {/* A tab, not a pushed screen, so there is no back-bar to carry the title
          and no safe-area strip below — mWeb's CartPage puts its heading in the
          page for the same reason, and the bar has to be cleared here. */}
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ paddingBottom: bottomSpace + (hasItems ? CHECKOUT_BAR_SPACE : 0) }}
      >
        <Text paddingHorizontal={16} paddingTop={12} fontSize={20} fontWeight="600" color="$color">
          {t('mweb.cart.title')}
        </Text>
        {body}
      </RefreshScrollView>
      {/* ONE cart-wide checkout — every line pays in a single product payment,
          pinned above the bottom nav while the lines scroll. */}
      {hasItems ? (
        <YStack position="absolute" left={16} right={16} bottom={barBottom}>
          <PrimaryButton
            testID="cart-checkout"
            label={checkoutLabel}
            onPress={() => navigation.navigate('ProductCheckout')}
          />
        </YStack>
      ) : null}
    </TabScreen>
  );
}
