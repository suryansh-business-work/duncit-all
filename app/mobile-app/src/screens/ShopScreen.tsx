import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
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
import { RefreshScrollView } from '@/components/PullToRefresh';

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

/** Pod Shop — the platform-wide browse catalogue of approved, pod-available
 * products with category chips, debounced search and sorting. Tapping a product
 * opens its detail screen; purchases happen through a pod's shop. RN twin of
 * mWeb's ShopPage. */
export function ShopScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted } = useThemeColors();
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
    body = <EmptyState testID="shop-empty" icon="search-off" title={t('mweb.shop.emptyState')} />;
  } else {
    body = (
      <YStack gap={12} paddingHorizontal={16} paddingTop={4}>
        <SectionHeader testID="shop-featured-heading" title={t('mweb.shop.featured')} />
        <XStack flexWrap="wrap" gap={12} justifyContent="space-between">
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
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ gap: 20, paddingTop: 4, paddingBottom: 32 }}
      >
        <PodShopSlider />
        <ShopFilterBar filters={filters} sortOptions={SORT_OPTIONS} muted={muted} />
        {body}
      </RefreshScrollView>
    </StackScreen>
  );
}
