import { Vibration } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import type { ShopProduct } from '@/screens/ShopScreen';

interface Props {
  product: ShopProduct;
  adding: boolean;
  onOpen: (productId: string) => void;
  onQuickAdd: (product: ShopProduct) => void;
}

/** One product tile in the Pod Shop browse grid — image, name, price and (when
 * reviewed) an average rating. Tapping opens the product detail screen; the
 * corner button quick-adds to cart via the cheapest pod (with a light haptic).
 * RN twin of mWeb's ShopProductCard. */
export function ShopProductCard({ product, adding, onOpen, onQuickAdd }: Readonly<Props>) {
  const imageUrl = product.image_url || product.images[0] || '';
  const summary = product.review_summary;
  const hasRating = !!summary && summary.total > 0;
  const outOfStock = product.pod_available_count <= 0;
  const quickAdd = () => {
    Vibration.vibrate(8);
    onQuickAdd(product);
  };
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
        {outOfStock ? (
          <XStack
            testID={`shop-product-oos-${product.id}`}
            position="absolute"
            top={8}
            right={8}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={999}
            backgroundColor="rgba(33,33,33,0.85)"
          >
            <Text fontSize={10} fontWeight="800" color="#ffffff">
              Out of stock
            </Text>
          </XStack>
        ) : (
          <YStack
            testID={`shop-product-add-${product.id}`}
            role="button"
            aria-label={`Add ${product.product_name} to cart`}
            onPress={quickAdd}
            position="absolute"
            top={8}
            right={8}
            width={34}
            height={34}
            borderRadius={999}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$primary"
            pressStyle={{ opacity: 0.8 }}
          >
            {adding ? (
              <Spinner size="small" color="$onPrimary" />
            ) : (
              <MaterialIcons name="add-shopping-cart" size={18} color="#ffffff" />
            )}
          </YStack>
        )}
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
