import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { Section, OptionChipRow } from '@/components/home/HomeFilterParts';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  DEFAULT_HOST_PODS_FILTERS,
  HOST_PRICE_OPTIONS,
  HOST_TIME_OPTIONS,
  HOST_TYPE_OPTIONS,
  type HostPodsFilters,
  type HostPriceFilter,
  type HostTimeFilter,
  type HostTypeFilter,
} from '@/utils/host-pods-filters';

interface Props {
  open: boolean;
  initial: HostPodsFilters;
  onApply: (filters: HostPodsFilters) => void;
  onClose: () => void;
}

/** Staged Type/Time/Price filter sheet for "Your pods": Apply commits the draft,
 * Reset restores the default (Upcoming), the ✕/backdrop closes without changes.
 * Mirrors mWeb's HostPodsFilterSheet. */
export function HostPodsFilterSheet({ open, initial, onApply, onClose }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const [draft, setDraft] = useState<HostPodsFilters>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="host-pods-filter-sheet">
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
                  Filter pods
                </Text>
                <XStack
                  testID="host-filter-close"
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
                  <Section title="Type">
                    <OptionChipRow
                      testIDPrefix="host-filter-type"
                      options={HOST_TYPE_OPTIONS}
                      value={draft.type}
                      onSelect={(v) => setDraft((d) => ({ ...d, type: v as HostTypeFilter }))}
                    />
                  </Section>
                  <Section title="Time">
                    <OptionChipRow
                      testIDPrefix="host-filter-time"
                      options={HOST_TIME_OPTIONS}
                      value={draft.time}
                      onSelect={(v) => setDraft((d) => ({ ...d, time: v as HostTimeFilter }))}
                    />
                  </Section>
                  <Section title="Price">
                    <OptionChipRow
                      testIDPrefix="host-filter-price"
                      options={HOST_PRICE_OPTIONS}
                      value={draft.price}
                      onSelect={(v) => setDraft((d) => ({ ...d, price: v as HostPriceFilter }))}
                    />
                  </Section>
                </YStack>
              </ScrollView>
              <XStack gap={12} padding={16}>
                <XStack
                  testID="host-filter-reset"
                  role="button"
                  aria-label="Reset filters"
                  onPress={() => setDraft(DEFAULT_HOST_PODS_FILTERS)}
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
                  testID="host-filter-apply"
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
