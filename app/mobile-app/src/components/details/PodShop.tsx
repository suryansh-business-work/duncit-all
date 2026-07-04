import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';

type Product = PodDetail['product_requests'][number];

function ProductRow({ product }: Readonly<{ product: Product }>) {
  const image = product.image_url || product.images?.[0] || '';
  return (
    <XStack
      gap={10}
      alignItems="center"
      padding={10}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <YStack
        width={48}
        height={48}
        borderRadius={10}
        overflow="hidden"
        backgroundColor="rgba(255,139,95,0.18)"
        alignItems="center"
        justifyContent="center"
      >
        {image ? (
          <AppImage source={{ uri: image }} style={{ width: 48, height: 48 }} resizeMode="cover" />
        ) : (
          <MaterialIcons name="shopping-bag" size={20} color="#ff8b5f" />
        )}
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="800" color="$color">
          {product.product_name}
        </Text>
        <Text fontSize={12} color="$muted">
          Available {product.available_count}
        </Text>
      </YStack>
      <Text fontSize={14} fontWeight="900" color="$color">
        ₹{product.unit_cost}
      </Text>
    </XStack>
  );
}

/** Pod Shop preview — lists the pod's real products (name · availability · price)
 * with an explicit empty state. RN port of mWeb's PodCommercePreview; shows only
 * real products, never perks/placeholder data. */
export function PodShop({ pod }: Readonly<{ pod: PodDetail }>) {
  const { primary } = useThemeColors();
  const products = pod.product_requests ?? [];

  return (
    <YStack
      margin={16}
      padding={16}
      gap={14}
      borderRadius={18}
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
      testID="pod-shop"
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack gap={8} alignItems="center">
          <MaterialIcons name="storefront" size={22} color="#ff8b5f" />
          <YStack>
            <Text fontSize={11} fontWeight="800" color="$muted" letterSpacing={0.4}>
              POD SHOP
            </Text>
            <Text fontSize={16} fontWeight="900" color="$color">
              Products
            </Text>
          </YStack>
        </XStack>
        <XStack
          paddingHorizontal={10}
          paddingVertical={5}
          borderRadius={999}
          backgroundColor="$surface"
        >
          <Text fontSize={12} fontWeight="800" color="$color">
            {pod.products_enabled ? 'Available' : 'Closed'}
          </Text>
        </XStack>
      </XStack>

      {products.length === 0 ? (
        <XStack gap={8} alignItems="center" testID="pod-shop-empty">
          <MaterialIcons name="info-outline" size={16} color={primary} />
          <Text fontSize={13.5} color="$muted">
            No products available yet.
          </Text>
        </XStack>
      ) : (
        <YStack gap={8}>
          {products.map((product) => (
            <ProductRow key={product.product_id} product={product} />
          ))}
        </YStack>
      )}
    </YStack>
  );
}
