import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { SAVED_SORTS, type SavedSort } from '@/utils/saved-filter';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  open: boolean;
  value: SavedSort;
  onClose: () => void;
  onSelect: (next: SavedSort) => void;
}

/** Bottom-sheet single-select sort for Saved Items (date / price / name / saved). */
export function SavedSortSheet({ open, value, onClose, onSelect }: Readonly<Props>) {
  const { primary } = useThemeColors();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="saved-sort-sheet">
          <YStack
            role="button"
            aria-label="Close sort"
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
                  Sort
                </Text>
                <XStack
                  testID="saved-sort-close"
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
              <YStack paddingHorizontal={16} paddingBottom={16}>
                <OptionChipRow
                  layout="column"
                  testIDPrefix="saved-sort"
                  options={SAVED_SORTS}
                  value={value}
                  onSelect={(next) => {
                    onSelect(next as SavedSort);
                    onClose();
                  }}
                />
              </YStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
