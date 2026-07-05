import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { ProductOrder } from '@/utils/product-orders';
import { PodProductOrderItem } from './PodProductOrderItem';

/** "Products & tracking" — the add-on products the buyer purchased in this pod
 * with fulfilment/tracking. Renders nothing when there are no product orders
 * (the common case). RN twin of mWeb's PodProductOrdersCard. */
export function PodProductOrdersCard({
  orders,
  loading,
}: Readonly<{ orders: ProductOrder[]; loading: boolean }>) {
  const { primary } = useThemeColors();

  if (loading && orders.length === 0) {
    return (
      <YStack
        borderRadius={18}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        padding={16}
        alignItems="center"
      >
        <Spinner testID="po-loading" color="$primary" />
      </YStack>
    );
  }
  if (orders.length === 0) return null;

  return (
    <YStack
      testID="pod-product-orders-card"
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={16}
      gap={12}
    >
      <XStack gap={8} alignItems="center">
        <MaterialIcons name="shopping-bag" size={18} color={primary} />
        <Text fontSize={15} fontWeight="900" color="$color">
          Products &amp; tracking
        </Text>
      </XStack>
      {orders.map((o) => (
        <PodProductOrderItem key={o.id} order={o} />
      ))}
    </YStack>
  );
}
