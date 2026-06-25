import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ReasonField } from './ReasonField';

interface Props {
  open: boolean;
  reason: string;
  onChangeReason: (v: string) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirm + required reason before cancelling an onboarding meeting. */
export function CancelDialog({
  open,
  reason,
  onChangeReason,
  busy,
  error,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="cancel-dialog">
            <YStack
              testID="cancel-backdrop"
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
              padding={20}
              gap={10}
            >
              <SafeAreaView edges={[]}>
                <Text fontSize={17} fontWeight="900" color="$color">
                  Cancel this meeting?
                </Text>
                <Text fontSize={13.5} color="$muted" paddingTop={6}>
                  Your onboarding meeting will be cancelled and the slot freed. You can book a new
                  one anytime.
                </Text>
                <ReasonField
                  testID="cancel-reason"
                  label="Why are you cancelling?"
                  value={reason}
                  onChangeText={onChangeReason}
                />
                {error ? (
                  <Text testID="cancel-error" fontSize={12.5} color="$danger" paddingTop={8}>
                    {error}
                  </Text>
                ) : null}
                <XStack gap={12} paddingTop={16}>
                  <XStack
                    testID="cancel-keep"
                    role="button"
                    aria-label="Keep meeting"
                    onPress={onClose}
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
                      Keep meeting
                    </Text>
                  </XStack>
                  <XStack
                    testID="cancel-confirm"
                    role="button"
                    aria-label="Cancel meeting"
                    aria-disabled={busy}
                    onPress={busy ? undefined : onConfirm}
                    flex={1}
                    height={46}
                    alignItems="center"
                    justifyContent="center"
                    borderRadius={12}
                    backgroundColor="$danger"
                    opacity={busy ? 0.7 : 1}
                    pressStyle={{ opacity: 0.85 }}
                  >
                    <Text fontSize={14} fontWeight="900" color={onPrimary}>
                      {busy ? 'Cancelling…' : 'Cancel meeting'}
                    </Text>
                  </XStack>
                </XStack>
              </SafeAreaView>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
