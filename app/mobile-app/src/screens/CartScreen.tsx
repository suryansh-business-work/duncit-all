import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { CartPodGroup } from '@/components/cart/CartPodGroup';
import { StackScreen } from '@/components/StackScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { cartLineKey, useCartStore, type CartLine } from '@/stores/cart.store';
import { parseSelectionKey } from '@/utils/product-selection';
import type { RootStackParamList } from '@/navigation/types';

/** The cart — every product added from any Pod Shop, grouped by pod. Checkout
 * runs per pod group (products are purchased with that pod's booking). RN twin
 * of mWeb's CartPage. */
export function CartScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted, onPrimary } = useThemeColors();
  const lines = useCartStore((s) => s.lines);
  const setLine = useCartStore((s) => s.setLine);
  const removeLine = useCartStore((s) => s.removeLine);
  const clearPod = useCartStore((s) => s.clearPod);

  const groups = useMemo(() => {
    const byPod = new Map<string, { title: string; lines: CartLine[] }>();
    for (const line of lines) {
      const group = byPod.get(line.pod_id) ?? { title: line.pod_title, lines: [] };
      group.lines.push(line);
      byPod.set(line.pod_id, group);
    }
    return Array.from(byPod.entries());
  }, [lines]);

  const checkoutPod = (podId: string, podLines: CartLine[]) => {
    navigation.navigate('Checkout', {
      podId,
      selectedProducts: podLines.map((line) => ({
        ...parseSelectionKey(cartLineKey(line)),
        quantity: line.quantity,
        unit_cost: line.unit_cost,
      })),
    });
  };

  let body;
  if (groups.length === 0) {
    body = (
      <YStack alignItems="center" gap={10} paddingVertical={64} testID="cart-empty">
        <MaterialIcons name="shopping-cart" size={44} color={muted} />
        <Text fontSize={17} fontWeight="900" color="$color">
          Your cart is empty
        </Text>
        <Text fontSize={13} color="$muted" textAlign="center">
          Add products from any Pod Shop and they will wait for you here.
        </Text>
        <XStack
          testID="cart-find-pod"
          role="button"
          aria-label="Find a pod"
          onPress={() => navigation.navigate('Home')}
          paddingHorizontal={24}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={14} fontWeight="900" color={onPrimary}>
            Find a pod
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
            onCheckout={() => checkoutPod(podId, group.lines)}
          />
        ))}
        <XStack
          testID="cart-clear"
          role="button"
          aria-label="Clear cart"
          onPress={() => groups.forEach(([podId]) => clearPod(podId))}
          alignSelf="center"
          padding={8}
          pressStyle={{ opacity: 0.7 }}
        >
          <Text fontSize={13} fontWeight="800" color="$danger">
            Clear cart
          </Text>
        </XStack>
      </YStack>
    );
  }

  return (
    <StackScreen title="Cart" testID="cart-screen">
      <ScrollView flex={1}>{body}</ScrollView>
    </StackScreen>
  );
}
