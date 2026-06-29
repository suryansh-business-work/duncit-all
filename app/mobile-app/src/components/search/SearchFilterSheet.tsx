import { useMemo } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import type { SearchCategory } from '@/hooks/useSearch';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  open: boolean;
  categories: SearchCategory[];
  categoryId: string;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
}

/** Bottom-sheet category filter, mirroring mWeb's Filter dialog. */
export function SearchFilterSheet({
  open,
  categories,
  categoryId,
  onClose,
  onSelect,
}: Readonly<Props>) {
  const { primary } = useThemeColors();
  const options = useMemo(
    () =>
      [
        ['', 'All'] as const,
        ...categories.map((c) => [c.id, c.name] as const),
      ] as readonly (readonly [string, string])[],
    [categories],
  );

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="search-filter-sheet">
          <YStack
            role="button"
            aria-label="Close filter"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack backgroundColor="$background" borderTopLeftRadius={22} borderTopRightRadius={22}>
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" justifyContent="space-between" padding={16}>
                <Text fontSize={17} fontWeight="900" color="$color">
                  Filter by Category
                </Text>
                <XStack
                  testID="search-filter-close"
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
              <YStack paddingHorizontal={16} paddingBottom={12}>
                {categories.length === 0 ? (
                  <Text fontSize={13} color="$muted">
                    No categories available yet.
                  </Text>
                ) : (
                  <OptionChipRow
                    testIDPrefix="search-filter-cat"
                    options={options}
                    value={categoryId}
                    onSelect={onSelect}
                  />
                )}
              </YStack>
              <XStack padding={16}>
                <XStack
                  testID="search-filter-apply"
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
                    Apply
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
