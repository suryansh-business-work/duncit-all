import { useMemo } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { Section, OptionChipRow } from '@/components/home/HomeFilterParts';
import type { HomeCategory } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  DATE_OPTIONS,
  PRICE_OPTIONS,
  SORT_OPTIONS,
  activeFilterCount,
  type DateFilter,
  type HomeFilters,
  type PriceFilter,
  type SortBy,
} from '@/utils/home-filters';

interface Props {
  open: boolean;
  onClose: () => void;
  categoryChips: HomeCategory[];
  categoryId: string;
  onCategory: (id: string) => void;
  filters: HomeFilters;
  onChange: (next: HomeFilters) => void;
  onReset: () => void;
}

/** Bottom-sheet filter for the home feed — category / price / when / sort,
 * mirroring mWeb's FilterMenu + FilterBar so both platforms filter identically. */
export function HomeFilterSheet({
  open,
  onClose,
  categoryChips,
  categoryId,
  onCategory,
  filters,
  onChange,
  onReset,
}: Readonly<Props>) {
  const { primary } = useThemeColors();
  const count = activeFilterCount(filters, categoryId);

  // Category chips share the generic row: prepend "All" and toggle on re-tap.
  const categoryOptions = useMemo(
    () =>
      [
        ['', 'All'] as const,
        ...categoryChips.map((c) => [c.id, c.level === 'SUB' ? `# ${c.name}` : c.name] as const),
      ] as readonly (readonly [string, string])[],
    [categoryChips],
  );

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="home-filter-sheet">
          <YStack
            role="button"
            aria-label="Close filters"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={22}
            borderTopRightRadius={22}
            maxHeight="82%"
          >
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" justifyContent="space-between" padding={16}>
                <Text fontSize={17} fontWeight="900" color="$color">
                  Filters
                </Text>
                <XStack
                  testID="home-filter-close"
                  role="button"
                  aria-label="Close"
                  onPress={onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={16}
                  backgroundColor="$surface"
                >
                  <MaterialIcons name="close" size={18} color={primary} />
                </XStack>
              </XStack>
              <ScrollView paddingHorizontal={16}>
                <YStack gap={16} paddingBottom={8}>
                  {categoryChips.length > 0 ? (
                    <Section title="Category">
                      <OptionChipRow
                        layout="scroll"
                        testIDPrefix="filter-cat"
                        options={categoryOptions}
                        value={categoryId}
                        onSelect={(val) => onCategory(val === categoryId ? '' : val)}
                      />
                    </Section>
                  ) : null}
                  <Section title="Price">
                    <OptionChipRow
                      testIDPrefix="filter-price"
                      options={PRICE_OPTIONS}
                      value={filters.price}
                      onSelect={(val) => onChange({ ...filters, price: val as PriceFilter })}
                    />
                  </Section>
                  <Section title="When">
                    <OptionChipRow
                      testIDPrefix="filter-date"
                      options={DATE_OPTIONS}
                      value={filters.date}
                      onSelect={(val) => onChange({ ...filters, date: val as DateFilter })}
                    />
                  </Section>
                  <Section title="Sort by">
                    <OptionChipRow
                      layout="column"
                      testIDPrefix="filter-sort"
                      options={SORT_OPTIONS}
                      value={filters.sort}
                      onSelect={(val) => onChange({ ...filters, sort: val as SortBy })}
                    />
                  </Section>
                </YStack>
              </ScrollView>
              <XStack gap={12} padding={16}>
                <XStack
                  testID="home-filter-reset"
                  role="button"
                  aria-label="Reset filters"
                  onPress={onReset}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  opacity={count === 0 ? 0.5 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="800" color="$color">
                    Reset
                  </Text>
                </XStack>
                <XStack
                  testID="home-filter-done"
                  role="button"
                  aria-label="Apply filters"
                  onPress={onClose}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  backgroundColor="$primary"
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="900" color="$onPrimary">
                    Done
                  </Text>
                </XStack>
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
