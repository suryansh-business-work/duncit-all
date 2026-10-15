import { StyleSheet, Vibration } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { CartNoticeChip } from '@/components/cart/CartNoticeChip';
import { CartQuantityControl } from '@/components/cart/CartQuantityControl';
import { cartControlLabels } from '@/components/cart/cartControlLabels';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { ShopProduct } from '@/screens/ShopScreen';
import { useCartControlNotice } from '@/hooks/useCartControlNotice';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE, withAlpha } from '@duncit/buttons-native';

interface Props {
  product: ShopProduct;
  /** How many of it the cart holds on the line this card steps (0 when none). */
  quantity: number;
  /** The most that line may hold. */
  max: number;
  /** The first add is still resolving its pod. */
  adding: boolean;
  /** The saved cart has been read back — until then a quantity arriving is not an add. */
  cartReady: boolean;
  onOpen: (productId: string) => void;
  onQuantity: (product: ShopProduct, next: number) => void;
}

const IMAGE_STYLE = { width: '100%', height: '100%' } as const;
const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 1, y: 1 } as const;

/** One product tile in the Pod Shop browse grid — image, name, price and (when
 * reviewed) an average rating. Tapping opens the product detail screen; the
 * cart control on the image's corner quick-adds via the cheapest pod (with a
 * light haptic), then steps or removes that line, and the image says so.
 * RN twin of mWeb's ShopProductCard. */
export function ShopProductCard({
  product,
  quantity,
  max,
  adding,
  cartReady,
  onOpen,
  onQuantity,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { warning, primary, brand } = useThemeColors();
  const labels = cartControlLabels(t, product.product_name);
  const notice = useCartControlNotice(quantity, cartReady);
  const imageUrl = product.image_url || product.images[0] || '';
  const summary = product.review_summary;
  const hasRating = !!summary && summary.total > 0;
  const outOfStock = product.pod_available_count <= 0;
  const change = (next: number) => {
    if (next > quantity) Vibration.vibrate(8);
    onQuantity(product, next);
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
        {/* A soft brand-tinted well, so a cut-out product shot still reads as a tile. */}
        <LinearGradient
          colors={[withAlpha(primary, 0.14), withAlpha(brand, 0.08)]}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={StyleSheet.absoluteFill}
        />
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
        <CartNoticeChip
          notice={notice}
          labels={labels}
          testID={`shop-product-notice-${product.id}`}
        />
        {/* Still there for a product that sold out while in the cart, so it can come out. */}
        {outOfStock && quantity <= 0 ? null : (
          <YStack position="absolute" right={8} bottom={8}>
            <CartQuantityControl
              quantity={quantity}
              max={max}
              labels={labels}
              busy={adding}
              onChange={change}
              testIdPrefix={`shop-product-cart-${product.id}`}
              testIds={{ add: `shop-product-add-${product.id}` }}
            />
          </YStack>
        )}
      </YStack>
      <YStack paddingTop={10} paddingHorizontal={4} paddingBottom={4} gap={4}>
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={2} lineHeight={18}>
          {product.product_name}
        </Text>
        {product.brand_name || hasRating ? (
          <XStack alignItems="center" gap={6}>
            {product.brand_name ? (
              <Text flexShrink={1} fontSize={12} color="$muted" numberOfLines={1}>
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
          </XStack>
        ) : null}
        {/* The price as a dark tag — the ink colour as the fill, so it inverts in dark mode. */}
        <XStack
          alignSelf="flex-start"
          marginTop={2}
          paddingHorizontal={10}
          paddingVertical={3}
          borderRadius={999}
          backgroundColor="$color"
        >
          <Text
            testID={`shop-product-price-${product.id}`}
            fontSize={14}
            fontWeight="700"
            color="$surface"
          >
            ₹{product.unit_cost}
          </Text>
        </XStack>
      </YStack>
    </SurfaceCard>
  );
}
