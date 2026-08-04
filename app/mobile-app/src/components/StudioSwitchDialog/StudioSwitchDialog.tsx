import { useEffect, useState, type ComponentProps } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { STUDIO_LABEL, availableModes, type StudioMode } from '@/utils/studio-mode';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const ICONS: Record<StudioMode, IconName> = {
  USER: 'person-outline',
  HOST: 'dashboard',
  VENUE: 'store',
  ECOMM: 'inventory-2',
  CLUB: 'groups',
};

const ACTIVE_CAPTION = 'Active right now';
const PENDING_CAPTION = 'Selected — press Switch to confirm';

/** Label for the confirm button — naming the target makes the two-step flow obvious. */
const switchButtonLabel = (changed: boolean, mode: StudioMode) =>
  changed ? `Switch to ${STUDIO_LABEL[mode]}` : 'Switch';

interface Props {
  open: boolean;
  roles: string[];
  current: StudioMode;
  onClose: () => void;
  onSelect: (mode: StudioMode) => void;
}

/** Bubble-style role switcher — one bubble per mode; the picked one lifts up
 * and expands into the big primary card below. Picking a bubble only stages the
 * choice; nothing switches until the Switch button below is pressed.
 * Identical to mWeb's StudioSwitchDialog (B3-5). */
export function StudioSwitchDialog({ open, roles, current, onClose, onSelect }: Readonly<Props>) {
  const { color, onPrimary, muted } = useThemeColors();
  const [pending, setPending] = useState<StudioMode>(current);

  // The dialog stays mounted between openings, so the staged pick is reset every
  // time it opens — otherwise it would reopen on a choice the user abandoned.
  useEffect(() => {
    setPending(current);
  }, [open, current]);

  const changed = pending !== current;

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
              <Text fontSize={17} fontWeight="700" color="$color" paddingBottom={12}>
                Switch role
              </Text>
              <XStack justifyContent="center" gap={16} paddingBottom={14}>
                {availableModes(roles).map((option) => {
                  const selected = option.mode === pending;
                  return (
                    <YStack
                      key={option.mode}
                      testID={`studio-switch-${option.mode}`}
                      role="button"
                      aria-label={option.label}
                      aria-pressed={selected}
                      onPress={() => setPending(option.mode)}
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
                  );
                })}
              </XStack>
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
                  <Text fontSize={18} fontWeight="700" color="$onPrimary" numberOfLines={1}>
                    {STUDIO_LABEL[pending]}
                  </Text>
                  <Text fontSize={11.5} fontWeight="700" color="$onPrimary" opacity={0.85}>
                    {changed ? PENDING_CAPTION : ACTIVE_CAPTION}
                  </Text>
                </YStack>
                <MaterialIcons name="check-circle" size={22} color={onPrimary} />
              </XStack>
              <YStack paddingTop={14}>
                <PrimaryButton
                  testID="studio-switch-confirm"
                  label={switchButtonLabel(changed, pending)}
                  disabled={!changed}
                  onPress={() => onSelect(pending)}
                />
              </YStack>
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
