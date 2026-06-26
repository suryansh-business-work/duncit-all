import { useState } from 'react';
import { Input, Text, XStack } from 'tamagui';

import { Backdrop, ModalButton } from './ModalBase';

interface Props {
  open: boolean;
  busy?: boolean;
  done?: boolean;
  error?: string;
  onSend: (email: string) => void;
  onClose: () => void;
}

/** Emails a chat/ticket transcript (server attaches a .docx by default, B15). */
export function EmailTranscriptModal({
  open,
  busy,
  done,
  error,
  onSend,
  onClose,
}: Readonly<Props>) {
  const [email, setEmail] = useState('');
  if (!open) return null;
  return (
    <Backdrop testID="support-email-modal">
      <Text fontSize={16} fontWeight="900" color="$color">
        Email this chat
      </Text>
      {done ? (
        <Text testID="email-done" fontSize={13} color="$muted">
          Transcript sent to {email}.
        </Text>
      ) : (
        <Input
          testID="email-input"
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          backgroundColor="$surface"
          borderColor="$borderColor"
        />
      )}
      {error ? (
        <Text testID="email-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      <XStack gap={8} justifyContent="flex-end">
        <ModalButton testID="email-close" label={done ? 'Done' : 'Cancel'} onPress={onClose} />
        {done ? null : (
          <ModalButton
            testID="email-send"
            label={busy ? 'Sending…' : 'Send'}
            primary
            disabled={busy || !email.trim()}
            onPress={() => onSend(email)}
          />
        )}
      </XStack>
    </Backdrop>
  );
}
