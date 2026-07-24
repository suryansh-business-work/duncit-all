import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import type { ShopProduct } from '@/screens/ShopScreen';

interface Props {
  product: ShopProduct;
  categoryLabel?: string;
  onOpen: (productId: string) => void;
}

/** One product tile in the Pod Shop browse grid — category badge, image, name,
 * price and (when reviewed) an average rating. Tapping opens the product detail
 * screen. RN twin of mWeb's ShopProductCard. */
export function ShopProductCard({ product, categoryLabel, onOpen }: Readonly<Props>) {
  const imageUrl = product.image_url || product.images[0] || '';
  const summary = product.review_summary;
  const hasRating = !!summary && summary.total > 0;
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
        {categoryLabel ? (
          <XStack
            testID={`shop-product-cat-${product.id}`}
            position="absolute"
            top={8}
            left={8}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={999}
            backgroundColor="$background"
          >
            <Text fontSize={10} fontWeight="800" color="$primary">
              {categoryLabel}
            </Text>
          </XStack>
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
        <XStack alignItems="center" justifyContent="space-between" marginTop={2}>
          <Text fontSize={14} fontWeight="900" color="$primary">
            ₹{product.unit_cost}
          </Text>
          {hasRating ? (
            <XStack testID={`shop-product-rating-${product.id}`} alignItems="center" gap={2}>
              <MaterialIcons name="star" size={13} color="#f5a623" />
              <Text fontSize={11} fontWeight="800" color="$color">
                {summary!.average_rating.toFixed(1)}
              </Text>
              <Text fontSize={11} color="$muted">
                ({summary!.total})
              </Text>
            </XStack>
          ) : null}
        </XStack>
      </YStack>
    </YStack>
  );
}
