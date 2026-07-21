import { Text, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import type { ShopProduct } from '@/screens/ShopScreen';

interface Props {
  product: ShopProduct;
  onOpen: (productId: string) => void;
}

/** One product tile in the Pod Shop browse grid — tapping opens the product
 * detail screen. RN twin of mWeb's ShopProductCard. */
export function ShopProductCard({ product, onOpen }: Readonly<Props>) {
  const imageUrl = product.image_url || product.images[0] || '';
  return (
    <YStack
      testID={`shop-product-${product.id}`}
      role="button"
      aria-label={`View ${product.product_name}`}
      onPress={() => onOpen(product.id)}
      width="47%"
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
      overflow="hidden"
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack aspectRatio={1} backgroundColor="$surface">
        {imageUrl ? (
          <AppImage
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : null}
      </YStack>
      <YStack padding={10} gap={2}>
        <Text fontSize={13} fontWeight="800" color="$color" numberOfLines={1}>
          {product.product_name}
        </Text>
        {product.brand_name ? (
          <Text fontSize={11} color="$muted" numberOfLines={1}>
            {product.brand_name}
          </Text>
        ) : null}
        <Text fontSize={14} fontWeight="900" color="$primary">
          ₹{product.unit_cost}
        </Text>
      </YStack>
    </YStack>
  );
}
