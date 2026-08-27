import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { CartPodGroup } from '@/components/cart/CartPodGroup';
import { StackScreen } from '@/components/StackScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { cartLineKey, groupLinesByPod, selectCartTotal, useCartStore } from '@/stores/cart.store';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The cart — every product added from any Pod Shop, grouped by pod for
 * display, paid together as ONE product payment (delivery is still quoted per
 * warehouse at checkout). RN twin of mWeb's CartPage. */
export function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted, onPrimary } = useThemeColors();
  const { t } = useTranslation();
  const exploreShopLabel = t('mweb.cart.exploreShop');
  const checkoutLabel = t('mweb.cart.checkout');
  const clearLabel = t('mweb.cart.clear');
  const lines = useCartStore((s) => s.lines);
  const setLine = useCartStore((s) => s.setLine);
  const removeLine = useCartStore((s) => s.removeLine);
  const clearAll = useCartStore((s) => s.clearAll);
  const total = useCartStore(selectCartTotal);

  const groups = useMemo(() => groupLinesByPod(lines), [lines]);

  let body;
  if (groups.length === 0) {
    body = (
      <YStack alignItems="center" gap={10} paddingVertical={64} testID="cart-empty">
        <MaterialIcons name="shopping-cart" size={44} color={muted} />
        <Text fontSize={17} fontWeight="700" color="$color">
          {t('mweb.cart.empty')}
        </Text>
        <Text fontSize={13} color="$muted" textAlign="center">
          {t('mweb.cart.emptyBody')}
        </Text>
        <XStack
          testID="cart-explore-shop"
          role="button"
          aria-label={exploreShopLabel}
          onPress={() => navigation.navigate('Shop')}
          paddingHorizontal={24}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={14} fontWeight="700" color={onPrimary}>
            {exploreShopLabel}
          </Text>
        </XStack>
      </YStack>
    );
  } else {
    body = (
      <YStack gap={12} padding={16}>
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
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={12} color="$muted">
            {t('mweb.cart.total')}
          </Text>
          <Text testID="cart-total" fontSize={16} fontWeight="700" color="$color">
            ₹{total}
          </Text>
        </XStack>
        {/* ONE cart-wide checkout — every line pays in a single product payment. */}
        <XStack
          testID="cart-checkout"
          role="button"
          aria-label={checkoutLabel}
          onPress={() => navigation.navigate('ProductCheckout')}
          height={46}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={14} fontWeight="700" color={onPrimary}>
            {checkoutLabel}
          </Text>
        </XStack>
        <XStack
          testID="cart-clear"
          role="button"
          aria-label={clearLabel}
          onPress={clearAll}
          alignSelf="center"
          padding={8}
          pressStyle={PRESS_STYLE.row}
        >
          <Text fontSize={13} fontWeight="600" color="$danger">
            {clearLabel}
          </Text>
        </XStack>
      </YStack>
    );
  }

  return (
    <StackScreen title={t('mweb.cart.title')} testID="cart-screen">
      <ScrollView flex={1}>{body}</ScrollView>
    </StackScreen>
  );
}
