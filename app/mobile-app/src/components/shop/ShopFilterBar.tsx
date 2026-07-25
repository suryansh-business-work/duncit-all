import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { OptionChipRow } from '@/components/home/HomeFilterParts';
import type { ShopSort } from '@/screens/ShopScreen';

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  categoryOptions: (readonly [string, string])[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  sortOptions: readonly (readonly [ShopSort, string])[];
  sort: ShopSort;
  onSortChange: (sort: ShopSort) => void;
  muted: string;
}

/** Search field + a filter button that reveals the category rail and sort — the
 * filters live behind the button (with an active-count badge) to keep the Pod
 * Shop header clean. RN twin of mWeb's ShopFilterBar. */
export function ShopFilterBar({
  query,
  onQueryChange,
  categoryOptions,
  categoryId,
  onCategoryChange,
  sortOptions,
  sort,
  onSortChange,
  muted,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const activeCount = (categoryId ? 1 : 0) + (sort === 'NAME' ? 0 : 1);
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
            aria-label="Search products"
            flex={1}
            unstyled
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search products or brands…"
            placeholderTextColor="$muted"
            color="$color"
            fontSize={15}
            returnKeyType="search"
          />
        </XStack>
        <XStack
          testID="shop-filter-toggle"
          role="button"
          aria-label="Filters"
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
          {activeCount > 0 ? (
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
              <Text fontSize={9} fontWeight="900" color="#ffffff">
                {activeCount}
              </Text>
            </YStack>
          ) : null}
        </XStack>
      </XStack>
      {open ? (
        <YStack gap={10}>
          {categoryOptions.length > 0 ? (
            <OptionChipRow
              testIDPrefix="shop-cat"
              options={[['', 'All'], ...categoryOptions]}
              value={categoryId}
              onSelect={onCategoryChange}
              layout="scroll"
            />
          ) : null}
          <OptionChipRow
            testIDPrefix="shop-sort"
            options={sortOptions}
            value={sort}
            onSelect={onSortChange}
            layout="scroll"
          />
        </YStack>
      ) : null}
    </YStack>
  );
}
