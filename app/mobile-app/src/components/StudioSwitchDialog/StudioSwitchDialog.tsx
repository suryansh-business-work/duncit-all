import type { ComponentProps } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Text, XStack, YStack } from 'tamagui';

import { durations } from '@/animations/motion';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { STUDIO_LABEL, availableModes, type StudioMode } from '@/utils/studio-mode';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const ICONS: Record<StudioMode, IconName> = {
  USER: 'person-outline',
  HOST: 'dashboard',
  VENUE: 'store',
  ECOMM: 'inventory-2',
};

interface Props {
  open: boolean;
  roles: string[];
  current: StudioMode;
  onClose: () => void;
  onSelect: (mode: StudioMode) => void;
}

/** Bubble-style role switcher — one bubble per mode; the active one lifts up
 * and expands into the big primary card below, with smooth Moti transitions.
 * Identical to mWeb's StudioSwitchDialog (B3-5). */
export function StudioSwitchDialog({ open, roles, current, onClose, onSelect }: Readonly<Props>) {
  const { color, onPrimary, muted } = useThemeColors();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="studio-switch-dialog">
          <YStack
            testID="studio-switch-backdrop"
            role="button"
            aria-label="Close"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            width="86%"
            maxWidth={420}
            backgroundColor="$background"
            borderRadius={20}
            padding={18}
            gap={14}
          >
            <SafeAreaView edges={[]}>
              <Text fontSize={17} fontWeight="900" color="$color" paddingBottom={12}>
                Switch role
              </Text>
              <XStack justifyContent="center" gap={16} paddingBottom={14}>
                {availableModes(roles).map((option) => {
                  const selected = option.mode === current;
                  return (
                    <MotiView
                      key={option.mode}
                      animate={{ scale: selected ? 1.12 : 1, translateY: selected ? -6 : 0 }}
                      transition={{ type: 'timing', duration: durations.fast }}
                    >
                      <YStack
                        testID={`studio-switch-${option.mode}`}
                        role="button"
                        aria-label={option.label}
                        aria-pressed={selected}
                        onPress={() => onSelect(option.mode)}
                        width={52}
                        height={52}
                        alignItems="center"
                        justifyContent="center"
                        borderRadius={26}
                        borderWidth={2}
                        borderColor={selected ? '$primary' : '$borderColor'}
                        backgroundColor={selected ? '$primary' : '$surface'}
                        pressStyle={{ opacity: 0.85 }}
                      >
                        <MaterialIcons
                          name={ICONS[option.mode]}
                          size={22}
                          color={selected ? onPrimary : color}
                        />
                      </YStack>
                    </MotiView>
                  );
                })}
              </XStack>
              <MotiView
                key={current}
                from={{ opacity: 0.4, translateY: 8, scale: 0.97 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'timing', duration: durations.base }}
              >
                <XStack
                  testID="studio-switch-active-card"
                  alignItems="center"
                  gap={12}
                  borderRadius={16}
                  paddingHorizontal={18}
                  paddingVertical={16}
                  backgroundColor="$primary"
                >
                  <YStack flex={1}>
                    <Text fontSize={18} fontWeight="900" color="$onPrimary" numberOfLines={1}>
                      {STUDIO_LABEL[current]}
                    </Text>
                    <Text fontSize={11.5} fontWeight="700" color="$onPrimary" opacity={0.85}>
                      Active right now — tap a bubble to switch
                    </Text>
                  </YStack>
                  <MaterialIcons name="check-circle" size={22} color={onPrimary} />
                </XStack>
              </MotiView>
              <Text fontSize={11.5} color={muted} paddingTop={10} textAlign="center">
                Switching changes your sidebar, header and dashboard.
              </Text>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
