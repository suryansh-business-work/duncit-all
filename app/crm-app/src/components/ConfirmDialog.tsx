import { Modal } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { RADII } from '@/constants/design';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** A destructive action (delete, clean) gets the danger colour. */
  danger?: boolean;
  busy?: boolean;
  /** Why the action failed, shown in the dialog so it can be tried again. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  testID: string;
}

/**
 * The app's confirm step for an action that cannot be undone — a Tamagui card
 * in a modal (never the platform alert), the portal's confirm dialog on the
 * phone. Back closes it unless the action is running.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  busy,
  error,
  onConfirm,
  onCancel,
  testID,
}: Readonly<Props>) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onCancel}
    >
      <YStack flex={1} justifyContent="center" padding="$5" backgroundColor="$scrim">
        <YStack
          role="alertdialog"
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
          <Text color="$muted">{message}</Text>
          {error ? (
            <Text color="$danger" role="alert" testID={`${testID}-error`}>
              {error}
            </Text>
          ) : null}
          <XStack justifyContent="flex-end" gap="$2">
            <DuncitButton
              label={cancelLabel}
              onPress={onCancel}
              variant="ghost"
              disabled={busy}
              testID={`${testID}-cancel`}
            />
            <DuncitButton
              label={confirmLabel}
              onPress={onConfirm}
              tone={danger ? 'danger' : 'primary'}
              loading={busy}
              testID={`${testID}-confirm`}
            />
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
