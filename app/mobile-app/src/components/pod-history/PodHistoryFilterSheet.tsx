import { useMemo } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { OptionChipRow, Section } from '@/components/home/HomeFilterParts';
import {
  activePodHistoryFilterCount,
  categoriesUnder,
  superCategories,
  type PodHistoryCategory,
  type PodHistoryFilters,
} from '@/utils/pod-history';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  open: boolean;
  filters: PodHistoryFilters;
  categories: PodHistoryCategory[];
  onChange: (next: PodHistoryFilters) => void;
  onReset: () => void;
  onClose: () => void;
}

const toOptions = (cats: PodHistoryCategory[]) =>
  cats.map((c) => [c.id, c.name] as const) as readonly (readonly [string, string])[];

/** Bottom-sheet Super Category → Category filter for Pod History (cascading). */
export function PodHistoryFilterSheet({
  open,
  filters,
  categories,
  onChange,
  onReset,
  onClose,
}: Readonly<Props>) {
  const { primary } = useThemeColors();
  const superOptions = useMemo(() => toOptions(superCategories(categories)), [categories]);
  const categoryOptions = useMemo(
    () => toOptions(categoriesUnder(categories, filters.superId)),
    [categories, filters.superId],
  );
  const count = activePodHistoryFilterCount(filters);

  const selectSuper = (val: string) =>
    onChange({ ...filters, superId: val === filters.superId ? '' : val, categoryId: '' });
  const selectCategory = (val: string) =>
    onChange({ ...filters, categoryId: val === filters.categoryId ? '' : val });

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="pod-history-filter-sheet">
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
                  Filter by category
                </Text>
                <XStack
                  testID="pod-history-filter-close"
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
                  <Section title="Super Category">
                    <OptionChipRow
                      testIDPrefix="ph-super"
                      options={superOptions}
                      value={filters.superId}
                      onSelect={selectSuper}
                    />
                  </Section>
                  <Section title="Category">
                    {filters.superId ? (
                      <OptionChipRow
                        testIDPrefix="ph-cat"
                        options={categoryOptions}
                        value={filters.categoryId}
                        onSelect={selectCategory}
                      />
                    ) : (
                      <Text testID="ph-cat-hint" fontSize={12.5} color="$muted">
                        Please select a Super Category first.
                      </Text>
                    )}
                  </Section>
                </YStack>
              </ScrollView>
              <XStack gap={12} padding={16}>
                <XStack
                  testID="pod-history-filter-reset"
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
                  testID="pod-history-filter-done"
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
