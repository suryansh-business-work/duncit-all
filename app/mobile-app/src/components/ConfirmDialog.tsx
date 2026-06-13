import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

/** Reusable confirmation sheet (Tamagui) — title + message + cancel/confirm.
 * Replaces native alert/confirm dialogs per the MUI/Tamagui-only rule. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  testID = 'confirm-dialog',
}: Readonly<Props>) {
  const { onPrimary } = useThemeColors();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID={testID}>
          <YStack
            role="button"
            aria-label="Close"
            onPress={onCancel}
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
            padding={20}
            gap={10}
          >
            <SafeAreaView edges={[]}>
              <Text fontSize={17} fontWeight="900" color="$color">
                {title}
              </Text>
              {message ? (
                <Text fontSize={13.5} color="$muted" paddingTop={6}>
                  {message}
                </Text>
              ) : null}
              <XStack gap={12} paddingTop={16}>
                <XStack
                  testID={`${testID}-cancel`}
                  role="button"
                  aria-label={cancelLabel}
                  onPress={onCancel}
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
                    {cancelLabel}
                  </Text>
                </XStack>
                <XStack
                  testID={`${testID}-confirm`}
                  role="button"
                  aria-label={confirmLabel}
                  onPress={onConfirm}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  backgroundColor={destructive ? '$danger' : '$primary'}
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="900" color={onPrimary}>
                    {confirmLabel}
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
