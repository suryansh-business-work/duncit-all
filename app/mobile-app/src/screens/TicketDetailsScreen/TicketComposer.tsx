import { useState } from 'react';
import { TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  /** Locked (reply hidden) once the ticket is resolved/closed (B7). */
  locked: boolean;
  busy: boolean;
  /** Resolves true when the reply was sent — only then is the input cleared. */
  onSend: (text: string) => Promise<boolean>;
}

const RESOLVED_NOTE = 'This conversation has been marked as resolved.';

/** Ticket reply row, or the locked "resolved" note once the ticket closes (B7). */
export function TicketComposer({ locked, busy, onSend }: Readonly<Props>) {
  const { muted, onPrimary, color: ink } = useThemeColors();
  const [text, setText] = useState('');

  if (locked) {
    return (
      <Text
        testID="ticket-resolved-note"
        fontSize={12}
        color="$muted"
        textAlign="center"
        padding={8}
      >
        {RESOLVED_NOTE}
      </Text>
    );
  }

  const submit = async () => {
    if (busy || !text.trim()) return;
    const sent = await onSend(text);
    if (sent) setText('');
  };

  return (
    <XStack gap={8} padding={12} alignItems="center">
      <XStack
        flex={1}
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius={22}
        paddingHorizontal={14}
        alignItems="center"
        minHeight={42}
      >
        <TextInput
          testID="ticket-reply-input"
          value={text}
          onChangeText={setText}
          placeholder="Write a reply…"
          placeholderTextColor={muted}
          style={{ flex: 1, color: ink, paddingVertical: 8 }}
          multiline
        />
      </XStack>
      <XStack
        testID="ticket-reply-send"
        role="button"
        aria-label="Send reply"
        onPress={() => void submit()}
        width={42}
        height={42}
        alignItems="center"
        justifyContent="center"
        borderRadius={21}
        backgroundColor="$primary"
        opacity={busy ? 0.6 : 1}
        pressStyle={{ opacity: 0.8 }}
      >
        <MaterialIcons name="send" size={18} color={onPrimary} />
      </XStack>
    </XStack>
  );
}
