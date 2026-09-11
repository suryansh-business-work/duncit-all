import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { DEFAULT_HOST_CHART_RANGE, hostRangeOptions, type HostChartRange } from '@duncit/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  open: boolean;
  initial: HostChartRange;
  hasPods: boolean;
  onApply: (range: HostChartRange) => void;
  onClose: () => void;
}

/** Staged range filter for the "Pods by Month" chart (feature 2): Apply commits,
 * Reset restores the default (Past 6 Months), the ✕/backdrop closes unchanged. */
export function HostInsightsFilterSheet({
  open,
  initial,
  hasPods,
  onApply,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const [draft, setDraft] = useState<HostChartRange>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const options = hostRangeOptions(hasPods, t);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="insights-filter-sheet">
          <YStack
            pressStyle={PRESS_STYLE.surface}
            role="button"
            aria-label={t('mweb.common.closeFilters')}
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            backgroundColor="$surface"
            borderTopLeftRadius={28}
            borderTopRightRadius={28}
            maxHeight="82%"
          >
            <SafeAreaView edges={['bottom']} style={SHEET_SAFE_AREA}>
              <XStack alignItems="center" justifyContent="space-between" padding={16}>
                <Text fontSize={17} fontWeight="600" color="$color">
                  Filter pods by month
                </Text>
                <XStack
                  pressStyle={PRESS_STYLE.ghost}
                  testID="insights-filter-close"
                  role="button"
                  aria-label={t('mweb.common.close')}
                  onPress={onClose}
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={999}
                  backgroundColor="$soft"
                >
                  <MaterialIcons name="close" size={20} color={color} />
                </XStack>
              </XStack>
              <ScrollView paddingHorizontal={16}>
                <YStack paddingBottom={8}>
                  <OptionChipRow<HostChartRange>
                    testIDPrefix="insights-range"
                    options={options}
                    value={draft}
                    onSelect={(v) => setDraft(v)}
                  />
                </YStack>
              </ScrollView>
              <XStack gap={12} padding={16}>
                <XStack
                  testID="insights-filter-reset"
                  role="button"
                  aria-label={t('mweb.common.resetFilters')}
                  onPress={() => setDraft(DEFAULT_HOST_CHART_RANGE)}
                  flex={1}
                  height={52}
                  gap={6}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={999}
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={PRESS_STYLE.control}
                >
                  <MaterialIcons name="close" size={18} color={color} />
                  <Text fontSize={15} fontWeight="600" color="$color">
                    Reset
                  </Text>
                </XStack>
                <XStack
                  testID="insights-filter-apply"
                  role="button"
                  aria-label={t('mweb.common.applyFilters')}
                  onPress={() => onApply(draft)}
                  flex={1}
                  height={52}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={999}
                  backgroundColor="$primary"
                  pressStyle={PRESS_STYLE.solid}
                >
                  <Text fontSize={15} fontWeight="600" color="$onPrimary">
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
