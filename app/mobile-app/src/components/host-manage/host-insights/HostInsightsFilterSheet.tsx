import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { Section, OptionChipRow } from '@/components/home/HomeFilterParts';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  DEFAULT_HOST_CHART_RANGE,
  hostRangeOptions,
  type HostChartRange,
} from '@/utils/host-insights';

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
  const { primary } = useThemeColors();
  const [draft, setDraft] = useState<HostChartRange>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const options = hostRangeOptions(hasPods);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="insights-filter-sheet">
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
                  Filter pods by month
                </Text>
                <XStack
                  testID="insights-filter-close"
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
                  <Section title="Pods by month">
                    <OptionChipRow
                      layout="column"
                      testIDPrefix="insights-range"
                      options={options}
                      value={draft}
                      onSelect={(v) => setDraft(v as HostChartRange)}
                    />
                  </Section>
                </YStack>
              </ScrollView>
              <XStack gap={12} padding={16}>
                <XStack
                  testID="insights-filter-reset"
                  role="button"
                  aria-label="Reset filters"
                  onPress={() => setDraft(DEFAULT_HOST_CHART_RANGE)}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="800" color="$color">
                    Reset
                  </Text>
                </XStack>
                <XStack
                  testID="insights-filter-apply"
                  role="button"
                  aria-label="Apply filters"
                  onPress={() => onApply(draft)}
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
