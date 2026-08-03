import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodShopSlider } from '@/components/shop/PodShopSlider';
import { ShopFilterBar } from '@/components/shop/ShopFilterBar';
import { ShopProductCard } from '@/components/shop/ShopProductCard';
import { StackScreen } from '@/components/StackScreen';
import { ShopProductsDocument } from '@/graphql/shop';
import { useHomeData } from '@/hooks/useHomeFeed';
import { useQuickAddToCart } from '@/hooks/useQuickAddToCart';
import { useShopFilters } from '@/hooks/useShopFilters';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';

export type ShopProduct = ResultOf<typeof ShopProductsDocument>['availablePodProducts'][number];

export type ShopSort = 'NAME' | 'PRICE_ASC' | 'PRICE_DESC';

const SORT_OPTIONS = [
  ['NAME', 'Name'],
  ['PRICE_ASC', 'Price ↑'],
  ['PRICE_DESC', 'Price ↓'],
] as const;

/** Pure sort helper shared with tests (twin of mWeb's sortShopProducts). */
export function sortShopProducts(products: ShopProduct[], sort: ShopSort): ShopProduct[] {
  const copy = [...products];
  if (sort === 'PRICE_ASC') return copy.sort((a, b) => a.unit_cost - b.unit_cost);
  if (sort === 'PRICE_DESC') return copy.sort((a, b) => b.unit_cost - a.unit_cost);
  return copy.sort((a, b) => a.product_name.localeCompare(b.product_name));
}

const TRUST_ITEMS = [
  ['verified-user', 'Trusted Pods', 'Quality Products'],
  ['local-offer', 'Best Prices', 'Great Deals'],
  ['local-shipping', 'Safe Delivery', 'Hassle Free'],
] as const;

/** Reassurance strip below the grid — static marketing copy. */
function TrustBar({ tint }: Readonly<{ tint: string }>) {
  return (
    <XStack
      justifyContent="space-around"
      margin={16}
      padding={14}
      borderRadius={16}
      backgroundColor="$surface"
    >
      {TRUST_ITEMS.map(([icon, title, caption]) => (
        <XStack key={title} alignItems="center" gap={8}>
          <MaterialIcons name={icon} size={20} color={tint} />
          <YStack>
            <Text fontSize={11.5} fontWeight="700" color="$color">
              {title}
            </Text>
            <Text fontSize={10.5} color="$muted">
              {caption}
            </Text>
          </YStack>
        </XStack>
      ))}
    </XStack>
  );
}

/** Pod Shop — the platform-wide browse catalogue of approved, pod-available
 * products with category chips, debounced search and sorting. Tapping a product
 * opens its detail screen; purchases happen through a pod's shop. RN twin of
 * mWeb's ShopPage. */
export function ShopScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted, primary } = useThemeColors();
  const { categories } = useHomeData();
  const { addingId, add } = useQuickAddToCart();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const filters = useShopFilters(categories, products);
  const visible = filters.visible;

  useEffect(() => {
    let active = true;
    graphqlRequest(ShopProductsDocument, undefined, { auth: true })
      .then((data) => active && setProducts(data.availablePodProducts))
      .catch((e) => active && setError(toErrorMessage(e, 'Could not load the shop.')))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  let body;
  if (isLoading) {
    body = (
      <YStack alignItems="center" paddingVertical={48} testID="shop-loading">
        <Spinner size="large" />
      </YStack>
    );
  } else if (error) {
    body = (
      <Text testID="shop-error" padding={24} color="$danger">
        {error}
      </Text>
    );
  } else if (visible.length === 0) {
    body = (
      <Text testID="shop-empty" padding={24} color="$muted">
        {t('mweb.shop.emptyState')}
      </Text>
    );
  } else {
    body = (
      <YStack>
        <Text
          testID="shop-featured-heading"
          fontSize={17}
          fontWeight="700"
          color="$color"
          paddingHorizontal={16}
          paddingTop={8}
        >
          {t('mweb.shop.featured')}
        </Text>
        <XStack flexWrap="wrap" gap={10} padding={16}>
          {visible.map((product) => (
            <ShopProductCard
              key={product.id}
              product={product}
              adding={addingId === product.id}
              onOpen={(productId) => navigation.navigate('ProductDetail', { productId })}
              onQuickAdd={add}
            />
          ))}
        </XStack>
      </YStack>
    );
  }

  // The cart entry point comes from the StackScreen back-bar now — it is the
  // same header cart every other screen shows.
  return (
    <StackScreen title={t('mweb.shop.title')} testID="shop-screen">
      <ScrollView flex={1}>
        <PodShopSlider />
        <ShopFilterBar filters={filters} sortOptions={SORT_OPTIONS} muted={muted} />
        {body}
        <TrustBar tint={primary} />
      </ScrollView>
    </StackScreen>
  );
}
