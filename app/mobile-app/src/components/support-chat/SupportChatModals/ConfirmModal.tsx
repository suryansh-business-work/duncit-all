import { Text, XStack } from 'tamagui';

import { Backdrop, ModalButton } from './ModalBase';

interface Props {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirms a resolve before locking the chat (B7) — Tamagui Backdrop, never an
 * Alert.alert. Wording mirrors mWeb's ConfirmDialog for parity (rule 27).
 */
export function ResolveConfirmModal({ open, busy, onConfirm, onCancel }: Readonly<Props>) {
  if (!open) return null;
  return (
    <Backdrop testID="resolve-confirm-modal">
      <Text fontSize={16} fontWeight="900" color="$color">
        Mark as resolved?
      </Text>
      <Text fontSize={13} color="$muted">
        Are you sure your issue has been resolved?
      </Text>
      <XStack gap={8} justifyContent="flex-end" flexWrap="wrap">
        <ModalButton
          testID="resolve-confirm-cancel"
          label="No, continue conversation"
          onPress={onCancel}
        />
        <ModalButton
          testID="resolve-confirm-yes"
          label={busy ? 'Resolving…' : 'Yes, mark as resolved'}
          primary
          disabled={busy}
          onPress={onConfirm}
        />
      </XStack>
    </Backdrop>
  );
}
