import { useState } from 'react';
import { Text, TextArea, XStack } from 'tamagui';

import { Backdrop, ModalButton } from './ModalBase';

interface Props {
  open: boolean;
  busy?: boolean;
  error?: string;
  deadlineLabel?: string;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

/** Captures an optional reason before re-opening a resolved ticket/chat (Bug 11). */
export function ReopenReasonModal({
  open,
  busy,
  error,
  deadlineLabel,
  onSubmit,
  onClose,
}: Readonly<Props>) {
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <Backdrop testID="reopen-reason-modal">
      <Text fontSize={16} fontWeight="900" color="$color">
        Re-open this conversation
      </Text>
      <Text fontSize={13} color="$muted">
        Tell us why you need to re-open it so the team can help faster (optional).
      </Text>
      {deadlineLabel ? (
        <Text testID="reopen-deadline" fontSize={12} color="$muted">
          You can reopen until {deadlineLabel}
        </Text>
      ) : null}
      <TextArea
        testID="reopen-reason-input"
        value={reason}
        onChangeText={setReason}
        placeholder="Reason for re-opening (optional)"
        maxLength={1000}
        backgroundColor="$surface"
        borderColor="$borderColor"
      />
      {error ? (
        <Text testID="reopen-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      <XStack gap={8} justifyContent="flex-end">
        <ModalButton testID="reopen-cancel" label="Cancel" onPress={onClose} />
        <ModalButton
          testID="reopen-submit"
          label={busy ? 'Re-opening…' : 'Re-open'}
          primary
          disabled={busy}
          onPress={() => onSubmit(reason.trim())}
        />
      </XStack>
    </Backdrop>
  );
}
