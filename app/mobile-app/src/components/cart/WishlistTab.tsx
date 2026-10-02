import { useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { wishlistKey } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AppImage } from '@/components/AppImage';
import { EmptyState } from '@/components/EmptyState';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CartLineMeta } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';

const THUMB_STYLE = { width: '100%', height: '100%' } as const;

/** One saved product: thumb, name, pod, unit price, Move to cart, remove. */
function WishlistRow({ item, divided }: Readonly<{ item: CartLineMeta; divided: boolean }>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const moveToCart = useWishlistStore((s) => s.moveToCart);
  const remove = useWishlistStore((s) => s.remove);
  const key = wishlistKey(item);
  return (
    <XStack
      testID={`wishlist-item-${key}`}
      gap={12}
      alignItems="flex-start"
      paddingVertical={12}
      borderTopWidth={divided ? 1 : 0}
      borderColor="$borderColor"
    >
      <YStack width={64} height={64} borderRadius={12} overflow="hidden" backgroundColor="$soft">
        {item.image_url ? (
          <AppImage source={{ uri: item.image_url }} style={THUMB_STYLE} resizeMode="cover" />
        ) : null}
      </YStack>
      <YStack flex={1} minWidth={0} gap={4}>
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={2} lineHeight={18}>
          {item.product_name}
          {item.variant_label ? ` — ${item.variant_label}` : ''}
        </Text>
        <Text fontSize={12} color="$muted" numberOfLines={1}>
          {item.pod_title}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('mweb.cart.unitEach', { vars: { price: `₹${item.unit_cost}` } })}
        </Text>
        <XStack
          testID={`wishlist-move-cart-${key}`}
          role="button"
          tabIndex={0}
          aria-label={t('mweb.cart.moveToCartItem', { vars: { name: item.product_name } })}
          onPress={() => moveToCart(item)}
          alignSelf="flex-start"
          gap={6}
          alignItems="center"
          marginTop={4}
          paddingVertical={8}
          paddingHorizontal={14}
          borderRadius={999}
          borderWidth={1}
          borderColor="$primary"
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="add-shopping-cart" size={16} color={primary} />
          <Text fontSize={13} fontWeight="600" color="$primary">
            {t('mweb.cart.moveToCart')}
          </Text>
        </XStack>
      </YStack>
      <XStack
        testID={`wishlist-remove-${key}`}
        role="button"
        tabIndex={0}
        aria-label={t('mweb.cart.removeFromWishlist', { vars: { name: item.product_name } })}
        hitSlop={4}
        onPress={() => remove(item)}
        width={36}
        height={36}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$soft"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="delete-outline" size={20} color={muted} />
      </XStack>
    </XStack>
  );
}

/** The Wishlist tab — products moved out of the cart to buy later. Twin of
 * mWeb's cart-page/WishlistTab. */
export function WishlistTab({ onExploreShop }: Readonly<{ onExploreShop: () => void }>) {
  const { t } = useTranslation();
  const items = useWishlistStore((s) => s.items);
  const hydrate = useWishlistStore((s) => s.hydrate);

  useEffect(() => {
    hydrate().catch(() => undefined);
  }, [hydrate]);

  if (items.length === 0) {
    return (
      <EmptyState
        testID="wishlist-empty"
        icon="favorite-border"
        title={t('mweb.cart.wishlistEmpty')}
        actionLabel={t('mweb.cart.exploreShop')}
        onAction={onExploreShop}
        actionTestID="wishlist-explore-shop"
      />
    );
  }

  return (
    <YStack padding={16}>
      <SurfaceCard testID="wishlist-list" paddingVertical={4}>
        {items.map((item, index) => (
          <WishlistRow key={wishlistKey(item)} item={item} divided={index > 0} />
        ))}
      </SurfaceCard>
    </YStack>
  );
}
