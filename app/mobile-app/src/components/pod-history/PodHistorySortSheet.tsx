import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { POD_HISTORY_SORTS, type PodHistorySort } from '@/utils/pod-history';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  open: boolean;
  value: PodHistorySort;
  onClose: () => void;
  onSelect: (next: PodHistorySort) => void;
}

/** Bottom-sheet single-select sort for Pod History (date / price). */
export function PodHistorySortSheet({ open, value, onClose, onSelect }: Readonly<Props>) {
  const { primary } = useThemeColors();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="pod-history-sort-sheet">
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
                  testID="pod-history-sort-close"
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
                  testIDPrefix="ph-sort"
                  options={POD_HISTORY_SORTS}
                  value={value}
                  onSelect={(next) => {
                    onSelect(next as PodHistorySort);
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
