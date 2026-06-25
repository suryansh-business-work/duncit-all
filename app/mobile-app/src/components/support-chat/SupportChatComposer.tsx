import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  busy?: boolean;
  onSendText: (text: string) => void;
  onAttach: () => void;
  onAttachDocument: () => void;
  onTyping: () => void;
}

/** Chat input row: attach image/video, attach document, typing-aware text field, send. */
export function SupportChatComposer({
  busy,
  onSendText,
  onAttach,
  onAttachDocument,
  onTyping,
}: Readonly<Props>) {
  const { muted, onPrimary, color: ink } = useThemeColors();
  const [text, setText] = useState('');
  const lastTyping = useRef(0);

  const change = (value: string) => {
    setText(value);
    const now = Date.now();
    if (now - lastTyping.current > 1500) {
      lastTyping.current = now;
      onTyping();
    }
  };

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    onSendText(body);
  };

  return (
    <XStack gap={8} padding={12} alignItems="center">
      <XStack
        testID="support-chat-attach"
        role="button"
        aria-label="Attach file"
        onPress={busy ? undefined : onAttach}
        width={42}
        height={42}
        alignItems="center"
        justifyContent="center"
        borderRadius={21}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={busy ? 0.6 : 1}
        pressStyle={{ opacity: 0.7 }}
      >
        {busy ? (
          <Spinner testID="support-chat-attach-busy" />
        ) : (
          <MaterialIcons name="attach-file" size={20} color={muted} />
        )}
      </XStack>
      <XStack
        testID="support-chat-attach-doc"
        role="button"
        aria-label="Attach document"
        onPress={busy ? undefined : onAttachDocument}
        width={42}
        height={42}
        alignItems="center"
        justifyContent="center"
        borderRadius={21}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={busy ? 0.6 : 1}
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons name="description" size={20} color={muted} />
      </XStack>
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
          testID="support-chat-input"
          value={text}
          onChangeText={change}
          placeholder="Type a message…"
          placeholderTextColor={muted}
          style={{ flex: 1, color: ink, paddingVertical: 8 }}
          multiline
        />
      </XStack>
      <XStack
        testID="support-chat-send"
        role="button"
        aria-label="Send message"
        onPress={send}
        width={42}
        height={42}
        alignItems="center"
        justifyContent="center"
        borderRadius={21}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.8 }}
      >
        <MaterialIcons name="send" size={18} color={onPrimary} />
      </XStack>
    </XStack>
  );
}
