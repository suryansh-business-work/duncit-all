import type { ComponentProps } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { availableModes, type StudioMode } from '@/utils/studio-mode';

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

/** Picks the active studio mode from the modes the user qualifies for — the RN
 * twin of mWeb's StudioSwitchDialog. */
export function StudioSwitchDialog({ open, roles, current, onClose, onSelect }: Readonly<Props>) {
  const { color, onPrimary } = useThemeColors();

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
            padding={16}
            gap={8}
          >
            <SafeAreaView edges={[]}>
              <Text fontSize={17} fontWeight="900" color="$color" paddingBottom={8}>
                Switch role
              </Text>
              {availableModes(roles).map((option) => {
                const selected = option.mode === current;
                return (
                  <XStack
                    key={option.mode}
                    testID={`studio-switch-${option.mode}`}
                    role="button"
                    aria-label={option.label}
                    aria-pressed={selected}
                    onPress={() => onSelect(option.mode)}
                    alignItems="center"
                    gap={12}
                    padding={12}
                    marginBottom={6}
                    borderRadius={12}
                    borderWidth={1}
                    borderColor={selected ? '$primary' : '$borderColor'}
                    backgroundColor={selected ? '$primary' : 'transparent'}
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <MaterialIcons
                      name={ICONS[option.mode]}
                      size={20}
                      color={selected ? onPrimary : color}
                    />
                    <Text
                      flex={1}
                      fontSize={14.5}
                      fontWeight="800"
                      color={selected ? '$onPrimary' : '$color'}
                    >
                      {option.label}
                    </Text>
                    {selected ? <MaterialIcons name="check" size={18} color={onPrimary} /> : null}
                  </XStack>
                );
              })}
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
