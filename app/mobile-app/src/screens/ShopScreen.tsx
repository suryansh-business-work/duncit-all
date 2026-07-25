import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodShopSlider } from '@/components/shop/PodShopSlider';
import { ShopFilterBar } from '@/components/shop/ShopFilterBar';
import { ShopHeaderCart } from '@/components/shop/ShopHeaderCart';
import { ShopProductCard } from '@/components/shop/ShopProductCard';
import { StackScreen } from '@/components/StackScreen';
import { ShopProductsDocument } from '@/graphql/shop';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useHomeData } from '@/hooks/useHomeFeed';
import { useQuickAddToCart } from '@/hooks/useQuickAddToCart';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { selectCartCount, useCartStore } from '@/stores/cart.store';
import { makeCategoryMatcher } from '@/utils/category-match';
import { toErrorMessage } from '@/utils/errors';
import type { RootStackParamList } from '@/navigation/types';

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
            <Text fontSize={11.5} fontWeight="900" color="$color">
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted, primary, color } = useThemeColors();
  const { categories } = useHomeData();
  const { addingId, add } = useQuickAddToCart();
  const cartCount = useCartStore(selectCartCount);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<ShopSort>('NAME');
  const search = useDebouncedValue(query);

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

  // Top filter chips are SUPER categories (the top-level vibe); the matcher keeps
  // products tagged at descendant categories/subs.
  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.level === 'SUPER')
        .map((c) => [c.id, c.name] as const)
        .sort((a, b) => a[1].localeCompare(b[1])),
    [categories],
  );

  // The card badge shows the most specific category the product carries — its SUB
  // category, else category, else super.
  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name] as const));
    return (product: ShopProduct) =>
      map.get(product.sub_category_id ?? product.category_id ?? product.super_category_id ?? '') ??
      '';
  }, [categories]);

  const visible = useMemo(() => {
    const matches = makeCategoryMatcher(categories);
    const term = search.trim().toLowerCase();
    const filtered = products
      .filter((product) => matches(product, categoryId))
      .filter(
        (product) =>
          !term ||
          product.product_name?.toLowerCase().includes(term) ||
          product.brand_name?.toLowerCase().includes(term),
      );
    return sortShopProducts(filtered, sort);
  }, [products, categories, categoryId, search, sort]);

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
        No products match your filters.
      </Text>
    );
  } else {
    body = (
      <YStack>
        <Text
          testID="shop-featured-heading"
          fontSize={17}
          fontWeight="900"
          color="$color"
          paddingHorizontal={16}
          paddingTop={8}
        >
          Featured Products
        </Text>
        <XStack flexWrap="wrap" gap={10} padding={16}>
          {visible.map((product) => (
            <ShopProductCard
              key={product.id}
              product={product}
              categoryLabel={categoryName(product)}
              adding={addingId === product.id}
              onOpen={(productId) => navigation.navigate('ProductDetail', { productId })}
              onQuickAdd={add}
            />
          ))}
        </XStack>
      </YStack>
    );
  }

  return (
    <StackScreen
      title="Pod Shop"
      testID="shop-screen"
      right={
        <ShopHeaderCart
          count={cartCount}
          tint={color}
          onPress={() => navigation.navigate('Cart')}
        />
      }
    >
      <ScrollView flex={1}>
        <PodShopSlider />
        <ShopFilterBar
          query={query}
          onQueryChange={setQuery}
          categoryOptions={categoryOptions}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          sortOptions={SORT_OPTIONS}
          sort={sort}
          onSortChange={setSort}
          muted={muted}
        />
        {body}
        <TrustBar tint={primary} />
      </ScrollView>
    </StackScreen>
  );
}
