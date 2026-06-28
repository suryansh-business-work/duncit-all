import type { ReactNode } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface SecuritySheetProps {
  open: boolean;
  title: string;
  testID: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom-sheet shell (overlay + titled header + scroll body) shared by the
 * change-password and delete-account dialogs — keeps each dialog focused on its
 * flow and under the 200-line cap. */
export function SecuritySheet({
  open,
  title,
  testID,
  onClose,
  children,
}: Readonly<SecuritySheetProps>) {
  const { color } = useThemeColors();

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} testID={testID}>
          <YStack
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
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            maxHeight="92%"
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
          >
            <SafeAreaView edges={['bottom']}>
              <XStack
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal={16}
                paddingTop={16}
                paddingBottom={8}
              >
                <Text fontSize={18} fontWeight="900" color="$color">
                  {title}
                </Text>
                <XStack
                  testID={`${testID}-close`}
                  role="button"
                  aria-label="Close"
                  onPress={onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                >
                  <MaterialIcons name="close" size={20} color={color} />
                </XStack>
              </XStack>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
                <YStack paddingHorizontal={16} paddingBottom={16} gap={12}>
                  {children}
                </YStack>
              </ScrollView>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
