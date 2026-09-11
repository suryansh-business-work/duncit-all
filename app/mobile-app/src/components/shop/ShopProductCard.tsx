import { Vibration } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { ShopProduct } from '@/screens/ShopScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  product: ShopProduct;
  adding: boolean;
  onOpen: (productId: string) => void;
  onQuickAdd: (product: ShopProduct) => void;
}

const IMAGE_STYLE = { width: '100%', height: '100%' } as const;

/** One product tile in the Pod Shop browse grid — image, name, price and (when
 * reviewed) an average rating. Tapping opens the product detail screen; the
 * round green "+" quick-adds to cart via the cheapest pod (with a light haptic).
 * RN twin of mWeb's ShopProductCard. */
export function ShopProductCard({ product, adding, onOpen, onQuickAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary, warning } = useThemeColors();
  const imageUrl = product.image_url || product.images[0] || '';
  const summary = product.review_summary;
  const hasRating = !!summary && summary.total > 0;
  const outOfStock = product.pod_available_count <= 0;
  const quickAdd = () => {
    Vibration.vibrate(8);
    onQuickAdd(product);
  };
  return (
    <SurfaceCard
      testID={`shop-product-${product.id}`}
      role="button"
      aria-label={`View ${product.product_name}`}
      onPress={() => onOpen(product.id)}
      width="47%"
      padding={8}
      pressStyle={PRESS_STYLE.surface}
    >
      <YStack aspectRatio={1} borderRadius={18} overflow="hidden" backgroundColor="$soft">
        {imageUrl ? (
          <AppImage source={{ uri: imageUrl }} style={IMAGE_STYLE} resizeMode="cover" />
        ) : null}
        {outOfStock ? (
          <XStack
            testID={`shop-product-oos-${product.id}`}
            position="absolute"
            top={8}
            right={8}
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={999}
            backgroundColor="rgba(33,33,33,0.85)"
          >
            <Text fontSize={11} fontWeight="600" color="#ffffff">
              {t('mweb.shop.outOfStock')}
            </Text>
          </XStack>
        ) : null}
      </YStack>
      <YStack paddingTop={8} paddingHorizontal={4} gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={2} lineHeight={18}>
          {product.product_name}
        </Text>
        {product.brand_name ? (
          <Text fontSize={12} color="$muted" numberOfLines={1}>
            {product.brand_name}
          </Text>
        ) : null}
        {hasRating ? (
          <XStack testID={`shop-product-rating-${product.id}`} alignItems="center" gap={2}>
            <MaterialIcons name="star" size={14} color={warning} />
            <Text fontSize={12} fontWeight="600" color="$color">
              {summary.average_rating.toFixed(1)}
            </Text>
            <Text fontSize={12} color="$muted">
              ({summary.total})
            </Text>
          </XStack>
        ) : null}
        <XStack alignItems="center" justifyContent="space-between" minHeight={36} marginTop={4}>
          <Text fontSize={16} fontWeight="700" color="$color">
            ₹{product.unit_cost}
          </Text>
          {outOfStock ? null : (
            <YStack
              testID={`shop-product-add-${product.id}`}
              role="button"
              aria-label={`Add ${product.product_name} to cart`}
              onPress={quickAdd}
              width={36}
              height={36}
              borderRadius={999}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$primary"
              pressStyle={PRESS_STYLE.control}
            >
              {adding ? (
                <Spinner size="small" color="$onPrimary" />
              ) : (
                <MaterialIcons name="add" size={22} color={onPrimary} />
              )}
            </YStack>
          )}
        </XStack>
      </YStack>
    </SurfaceCard>
  );
}
