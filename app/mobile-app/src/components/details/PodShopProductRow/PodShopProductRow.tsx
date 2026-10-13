import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { CartNoticeChip } from '@/components/cart/CartNoticeChip';
import { CartQuantityControl } from '@/components/cart/CartQuantityControl';
import { cartControlLabels } from '@/components/cart/cartControlLabels';
import { useCartControlNotice } from '@/hooks/useCartControlNotice';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { ProductRowShell, ProductThumb, type Product } from './ProductRowParts';

/** A product row — the cart control under its name: a "+" that becomes the
 * remove / count / plus pill once the product is in the cart (no checkbox / no
 * whole-card toggle), quantity clamped to the available stock. */
export function PodShopProductRow({
  product,
  quantity,
  onUpdate,
  onInfo,
  readOnly,
}: Readonly<{
  product: Product;
  quantity: number;
  onUpdate: (productId: string, quantity: number) => void;
  onInfo: (productId: string) => void;
  readOnly?: boolean;
}>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const image = product.image_url || product.images?.[0] || '';
  const maxQuantity = Number(product.available_count ?? product.quantity ?? 0);
  // Members can only view products — never select them (avoids a re-charge).
  const selected = !readOnly && quantity > 0;
  const shownQuantity = selected ? quantity : 0;
  const labels = cartControlLabels(t, product.product_name);
  const notice = useCartControlNotice(shownQuantity);
  const unitCost = Number(product.unit_cost ?? 0);
  const lineTotal = unitCost * quantity;
  const priceLabel = selected ? `+₹${lineTotal}` : `₹${unitCost}`;
  // Nothing to add from a sold-out row; a row already in the cart keeps its pill.
  const canBuy = !readOnly && (quantity > 0 || maxQuantity > 0);
  return (
    <ProductRowShell testID={`pod-shop-row-${product.product_id}`} selected={selected}>
      <ProductThumb image={image} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {product.product_name}
        </Text>
        <Text fontSize={12} color="$muted">
          Available {maxQuantity}
        </Text>
        {canBuy ? (
          <XStack marginTop={6}>
            <CartQuantityControl
              quantity={quantity}
              max={maxQuantity}
              labels={labels}
              size="sm"
              onChange={(next) => onUpdate(product.product_id, next)}
              testIdPrefix={`pod-shop-cart-${product.product_id}`}
              testIds={{
                add: `pod-shop-add-${product.product_id}`,
                decrease: `pod-shop-dec-${product.product_id}`,
                increase: `pod-shop-inc-${product.product_id}`,
                count: `pod-shop-qty-${product.product_id}`,
              }}
            />
          </XStack>
        ) : null}
      </YStack>
      <XStack
        testID={`pod-shop-info-${product.product_id}`}
        role="button"
        tabIndex={0}
        aria-label={`View ${product.product_name} details`}
        hitSlop={7}
        onPress={() => onInfo(product.product_id)}
        width={30}
        height={30}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        pressStyle={PRESS_STYLE.inline}
      >
        <MaterialIcons name="info-outline" size={18} color={muted} />
      </XStack>
      <Text fontSize={14} fontWeight="700" color="$color">
        {priceLabel}
      </Text>
      <CartNoticeChip
        notice={notice}
        labels={labels}
        testID={`pod-shop-notice-${product.product_id}`}
        top={4}
      />
    </ProductRowShell>
  );
}
