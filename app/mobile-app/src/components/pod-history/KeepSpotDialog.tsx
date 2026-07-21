import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface KeepSpotDialogProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Backout attempts the user still has for this pod (max − used). */
  attemptsLeft: number;
  /** Server error (e.g. replacement already confirmed) shown inside the sheet. */
  error?: string | null;
}

/** "Change of plans?" sheet — cancel an in-process backout and restore the
 * booking. RN twin of mWeb's KeepSpotDialog. */
export function KeepSpotDialog({
  open,
  busy,
  onClose,
  onConfirm,
  attemptsLeft,
  error = null,
}: Readonly<KeepSpotDialogProps>) {
  const { color, onPrimary } = useThemeColors();

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={busy ? undefined : onClose}
    >
      <ModalThemeScope>
        <YStack flex={1} testID="keep-spot-dialog">
          <YStack
            role="button"
            aria-label="Close"
            onPress={busy ? undefined : onClose}
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
            maxHeight="86%"
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
          >
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" justifyContent="space-between" padding={16}>
                <Text fontSize={18} fontWeight="900" color="$color">
                  Change of plans?
                </Text>
                <XStack
                  testID="keep-spot-close"
                  role="button"
                  aria-label="Close"
                  onPress={busy ? undefined : onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                >
                  <MaterialIcons name="close" size={20} color={color} />
                </XStack>
              </XStack>

              <YStack paddingHorizontal={16} gap={10}>
                <Text fontSize={14} lineHeight={22} color="$color">
                  Do you want us to stop searching for a replacement and keep this spot for you?
                  (NOTE: If you wish you Backout from the Pod again, you can only do it for up to{' '}
                  {attemptsLeft} more times)
                </Text>
                {error ? (
                  <Text testID="keep-spot-error" fontSize={13} fontWeight="800" color="$danger">
                    {error}
                  </Text>
                ) : null}
              </YStack>

              <XStack padding={16} gap={12}>
                <XStack
                  testID="keep-spot-cancel"
                  role="button"
                  aria-label="Close"
                  aria-disabled={busy}
                  onPress={busy ? undefined : onClose}
                  flex={1}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  opacity={busy ? 0.6 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="800" color="$color">
                    Close
                  </Text>
                </XStack>
                <XStack
                  testID="keep-spot-confirm"
                  role="button"
                  aria-label="Keep my spot"
                  aria-disabled={busy}
                  onPress={busy ? undefined : onConfirm}
                  flex={2}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  borderRadius={12}
                  backgroundColor="$primary"
                  opacity={busy ? 0.7 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  {busy ? <Spinner size="small" color={onPrimary} /> : null}
                  <Text fontSize={14} fontWeight="900" color={onPrimary}>
                    {busy ? 'Restoring…' : 'Keep My Spot'}
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
