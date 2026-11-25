import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal } from 'react-native';
import { Text, YStack } from 'tamagui';

import { RADII } from '@/constants/design';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Back closes it; left out while the dialog's work is running. */
  onRequestClose?: () => void;
  testID: string;
}

/** A titled card over a scrim — the shell of the app's small dialogs, kept clear of the keyboard. */
export function DialogCard({ open, title, children, onRequestClose, testID }: Readonly<Props>) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onRequestClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <YStack flex={1} justifyContent="center" padding="$5" backgroundColor="$scrim">
          <YStack
            role="dialog"
            aria-label={title}
            backgroundColor="$surface"
            borderRadius={RADII.lg}
            borderWidth={1}
            borderColor="$borderColor"
            padding="$5"
            gap="$3"
            testID={testID}
          >
            <Text fontSize="$6" fontWeight="800" role="heading">
              {title}
            </Text>
            {children}
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </Modal>
  );
}
