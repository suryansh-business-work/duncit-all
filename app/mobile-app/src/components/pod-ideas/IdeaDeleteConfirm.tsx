import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation sheet before permanently deleting one of the viewer's own ideas
 * (its likes and comments go with it). RN twin of mWeb's delete ConfirmDialog. */
export function IdeaDeleteConfirm({ open, busy, onCancel, onConfirm }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const dismiss = busy ? undefined : onCancel;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={dismiss}>
      <ModalThemeScope>
        <YStack flex={1} alignItems="center" justifyContent="center" testID="idea-delete-confirm">
          <YStack
            role="button"
            aria-label="Close"
            onPress={dismiss}
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
                Delete this idea?
              </Text>
              <Text fontSize={13.5} color="$muted" paddingTop={6}>
                This permanently removes the idea, its likes, and all comments.
              </Text>
              <XStack gap={12} paddingTop={16}>
                <XStack
                  testID="idea-delete-cancel"
                  role="button"
                  aria-label="Cancel"
                  aria-disabled={busy}
                  onPress={dismiss}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  opacity={busy ? 0.6 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="800" color="$color">
                    Cancel
                  </Text>
                </XStack>
                <XStack
                  testID="idea-delete-confirm-btn"
                  role="button"
                  aria-label="Confirm delete"
                  aria-disabled={busy}
                  onPress={busy ? undefined : onConfirm}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  borderRadius={12}
                  backgroundColor="$danger"
                  opacity={busy ? 0.7 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  {busy ? <Spinner size="small" color={onPrimary} /> : null}
                  <Text fontSize={14} fontWeight="900" color={onPrimary}>
                    {busy ? 'Deleting…' : 'Delete'}
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
