import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { OptionChipRow, Section } from '@/components/home/HomeFilterParts';
import { SHOP_RATING_OPTIONS, type ShopFilters } from '@/hooks/useShopFilters';
import type { ShopSort } from '@/screens/ShopScreen';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  filters: ShopFilters;
  sortOptions: readonly (readonly [ShopSort, string])[];
  muted: string;
}

/** Search field + a filter button that reveals the Super → Category → Sub
 * cascade, rating buckets, an include-out-of-stock toggle and sort. Filters live
 * behind the button (with an active-count badge) to keep the header clean. RN
 * twin of mWeb's ShopFilterBar. */
export function ShopFilterBar({ filters, sortOptions, muted }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <YStack gap={10} paddingHorizontal={16} paddingTop={8}>
      <XStack gap={8} alignItems="center">
        <XStack
          flex={1}
          alignItems="center"
          gap={8}
          paddingHorizontal={12}
          height={46}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$background"
        >
          <MaterialIcons name="search" size={20} color={muted} />
          <Input
            testID="shop-search-input"
            aria-label={t('mweb.shop.searchProducts')}
            flex={1}
            unstyled
            value={filters.query}
            onChangeText={filters.setQuery}
            placeholder={t('mweb.shop.searchPlaceholder')}
            placeholderTextColor="$muted"
            color="$color"
            fontSize={15}
            returnKeyType="search"
          />
        </XStack>
        <XStack
          testID="shop-filter-toggle"
          role="button"
          aria-label={t('mweb.common.filters')}
          onPress={() => setOpen((v) => !v)}
          width={46}
          height={46}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor={open ? '$primary' : '$background'}
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.8 }}
        >
          <MaterialIcons name="tune" size={20} color={open ? '#ffffff' : muted} />
          {filters.activeCount > 0 ? (
            <YStack
              testID="shop-filter-count"
              position="absolute"
              top={-2}
              right={-2}
              minWidth={16}
              height={16}
              paddingHorizontal={3}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              backgroundColor="$danger"
            >
              <Text fontSize={9} fontWeight="700" color="#ffffff">
                {filters.activeCount}
              </Text>
            </YStack>
          ) : null}
        </XStack>
      </XStack>
      {open ? (
        <YStack gap={14} paddingBottom={4}>
          {filters.superOptions.length > 0 ? (
            <Section title={t('mweb.common.superCategory')}>
              <OptionChipRow
                testIDPrefix="shop-super"
                options={[['', 'All'], ...filters.superOptions]}
                value={filters.superId}
                onSelect={filters.selectSuper}
                layout="scroll"
              />
            </Section>
          ) : null}
          {filters.categoryOptions.length > 0 ? (
            <Section title={t('mweb.common.category')}>
              <OptionChipRow
                testIDPrefix="shop-cat"
                options={[['', 'All'], ...filters.categoryOptions]}
                value={filters.categoryId}
                onSelect={filters.selectCategory}
                layout="scroll"
              />
            </Section>
          ) : null}
          {filters.subOptions.length > 0 ? (
            <Section title="Sub-category">
              <OptionChipRow
                testIDPrefix="shop-sub"
                options={[['', 'All'], ...filters.subOptions]}
                value={filters.subId}
                onSelect={filters.setSubId}
                layout="scroll"
              />
            </Section>
          ) : null}
          <Section title={t('mweb.shop.rating')}>
            <OptionChipRow
              testIDPrefix="shop-rating"
              options={SHOP_RATING_OPTIONS}
              value={filters.minRating}
              onSelect={filters.setMinRating}
              layout="scroll"
            />
          </Section>
          <XStack
            testID="shop-oos-toggle"
            role="checkbox"
            aria-label={t('mweb.shop.includeOutOfStock')}
            aria-checked={filters.includeOutOfStock}
            onPress={() => filters.setIncludeOutOfStock(!filters.includeOutOfStock)}
            alignItems="center"
            gap={8}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons
              name={filters.includeOutOfStock ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={filters.includeOutOfStock ? '#2e7d32' : muted}
            />
            <Text fontSize={13} fontWeight="700" color="$color">
              {t('mweb.shop.includeOutOfStock')}
            </Text>
          </XStack>
          <Section title={t('mweb.common.sort')}>
            <OptionChipRow
              testIDPrefix="shop-sort"
              options={sortOptions}
              value={filters.sort}
              onSelect={filters.setSort}
              layout="scroll"
            />
          </Section>
        </YStack>
      ) : null}
    </YStack>
  );
}
