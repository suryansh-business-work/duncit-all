import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, XStack, YStack } from 'tamagui';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { DeliveryAddressBar } from '@/components/shop/DeliveryAddressBar';
import { PodShopSlider } from '@/components/shop/PodShopSlider';
import { ShopFilterBar } from '@/components/shop/ShopFilterBar';
import { ShopProductCard } from '@/components/shop/ShopProductCard';
import { StackScreen } from '@/components/StackScreen';
import { PillTabs, type PillTab } from '@/components/PillTabs';
import { RentablePodsList } from '@/components/shop/RentablePodsList';
import { ShopProductsDocument } from '@/graphql/shop';
import { useHomeData } from '@/hooks/useHomeFeed';
import { useQuickAddToCart } from '@/hooks/useQuickAddToCart';
import { useShopFilters } from '@/hooks/useShopFilters';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView, useRefreshRegistration } from '@/components/PullToRefresh';
import { useLoadingRegion } from '@/components/Skeleton';

export type ShopProduct = ResultOf<typeof ShopProductsDocument>['availablePodProducts'][number];

export type ShopSort = 'NAME' | 'PRICE_ASC' | 'PRICE_DESC';

type ShopTab = 'shop' | 'rent';
const SHOP_TABS: readonly PillTab<ShopTab>[] = [
  { key: 'shop', labelKey: 'venueRentals.guest.shopTab' },
  { key: 'rent', labelKey: 'venueRentals.guest.rentTab' },
];

/** Pure sort helper shared with tests (twin of mWeb's sortShopProducts). */
export function sortShopProducts(products: ShopProduct[], sort: ShopSort): ShopProduct[] {
  const copy = [...products];
  if (sort === 'PRICE_ASC') return copy.sort((a, b) => a.unit_cost - b.unit_cost);
  if (sort === 'PRICE_DESC') return copy.sort((a, b) => b.unit_cost - a.unit_cost);
  return copy.sort((a, b) => a.product_name.localeCompare(b.product_name));
}

/** Pod Shop — the platform-wide browse catalogue of approved, pod-available
 * products: the "Deliver to" bar, debounced search with a filter button, the
 * promo slider, then the super-category pills over the product grid. Tapping a
 * product opens its detail screen. RN twin of mWeb's ShopPage. */
export function ShopScreen() {
  const loadingRegion = useLoadingRegion();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { muted } = useThemeColors();
  const { categories } = useHomeData();
  const { addingId, notice, cartReady, lineOf, setQuantity } = useQuickAddToCart();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const filters = useShopFilters(categories, products);
  const visible = filters.visible;
  // The same three sort choices (and copy) as mWeb's SHOP_SORT_OPTIONS.
  const sortOptions = useMemo(
    () =>
      [
        ['NAME', t('mweb.shop.sortName')],
        ['PRICE_ASC', t('mweb.shop.sortPriceAsc')],
        ['PRICE_DESC', t('mweb.shop.sortPriceDesc')],
      ] as const,
    [t],
  );

  // The "Deliver to" pincode, once the bar knows it (null until then) — the
  // list leaves out brands that do not deliver there.
  const [pincode, setPincode] = useState<string | null>(null);
  // Pod Shop | Pod Rent — the same switch as mWeb's /shop.
  const [tab, setTab] = useState<ShopTab>('shop');

  useEffect(() => {
    if (pincode === null) return;
    let active = true;
    setIsLoading(true);
    setFailed(false);
    graphqlRequest(ShopProductsDocument, pincode ? { deliveryPincode: pincode } : {}, {
      auth: true,
    })
      .then((data) => active && setProducts(data.availablePodProducts))
      .catch((error: unknown) => {
        logs.mobileApp.error('ShopScreen', 'loadProducts', { error });
        if (active) setFailed(true);
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [attempt, pincode]);

  // Pull-to-refresh reloads the catalogue.
  useRefreshRegistration(reload);

  let body;
  if (isLoading) {
    body = (
      <YStack alignItems="center" paddingVertical={48} testID="shop-loading">
        <Spinner {...loadingRegion} size="large" />
      </YStack>
    );
  } else if (failed) {
    body = (
      <YStack padding={24}>
        <LoadErrorNotice
          testID="shop-error"
          message={t('mweb.shop.loadError')}
          retryLabel={t('mweb.shop.retry')}
          onRetry={reload}
        />
      </YStack>
    );
  } else if (visible.length === 0) {
    body = <EmptyState testID="shop-empty" icon="search-off" title={t('mweb.shop.emptyState')} />;
  } else {
    body = (
      <YStack gap={12} paddingHorizontal={16} paddingTop={4}>
        <SectionHeader testID="shop-featured-heading" title={t('mweb.shop.featured')} />
        {notice ? (
          <NoticeCard testID="shop-quick-add-notice" tone={notice.tone} title={notice.message} />
        ) : null}
        <XStack flexWrap="wrap" gap={12} justifyContent="space-between">
          {visible.map((product) => {
            const line = lineOf(product.id);
            return (
              <ShopProductCard
                key={product.id}
                product={product}
                quantity={line?.quantity ?? 0}
                max={line?.max_quantity ?? product.pod_available_count}
                adding={addingId === product.id}
                cartReady={cartReady}
                onOpen={(productId) => navigation.navigate('ProductDetail', { productId })}
                onQuantity={setQuantity}
              />
            );
          })}
        </XStack>
      </YStack>
    );
  }

  // The cart entry point comes from the StackScreen back-bar now — it is the
  // same header cart every other screen shows.
  return (
    <StackScreen title={t('mweb.shop.title')} testID="shop-screen">
      {/* Where the shop's orders ship to — the shop's stand-in for the city pill. */}
      <DeliveryAddressBar onPincodeChange={setPincode} />
      <YStack paddingHorizontal={16} paddingTop={8}>
        <PillTabs
          tabs={SHOP_TABS}
          value={tab}
          onChange={setTab}
          ariaLabel={t('mweb.shop.title')}
          testIDPrefix="shop-tab"
        />
      </YStack>
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ gap: 20, paddingTop: 4, paddingBottom: 32 }}
      >
        {tab === 'rent' ? <RentablePodsList /> : null}
        {tab === 'shop' ? (
          <>
            <ShopFilterBar filters={filters} sortOptions={sortOptions} muted={muted} />
            <PodShopSlider />
            {filters.superOptions.length > 0 ? (
              <YStack
                paddingHorizontal={16}
                testID="shop-category-pills"
                aria-label={t('mweb.common.category')}
              >
                <OptionChipRow
                  testIDPrefix="shop-super"
                  options={[['', t('mweb.common.all')], ...filters.superOptions]}
                  value={filters.superId}
                  onSelect={filters.selectSuper}
                  layout="scroll"
                />
              </YStack>
            ) : null}
            {body}
          </>
        ) : null}
      </RefreshScrollView>
    </StackScreen>
  );
}
