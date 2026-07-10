import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { describeAttachment } from '@/utils/attachment';

interface ChipProps {
  url: string;
  index: number;
  tint: string;
  onRemove?: (url: string) => void;
}

/** A staged (uploaded, not yet sent) attachment: file name + a remove button. */
function AttachmentChip({ url, index, tint, onRemove }: Readonly<ChipProps>) {
  const { name } = describeAttachment(url);
  return (
    <XStack
      testID={`support-chat-attach-preview-${index}`}
      alignItems="center"
      gap={6}
      paddingVertical={4}
      paddingLeft={8}
      paddingRight={4}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      maxWidth={180}
    >
      <MaterialIcons name="insert-drive-file" size={14} color={tint} />
      <Text flex={1} fontSize={12} color="$color" numberOfLines={1}>
        {name}
      </Text>
      <XStack
        testID={`support-chat-attach-remove-${index}`}
        role="button"
        aria-label="Remove attachment"
        onPress={() => onRemove?.(url)}
        width={22}
        height={22}
        alignItems="center"
        justifyContent="center"
        pressStyle={{ opacity: 0.6 }}
      >
        <MaterialIcons name="close" size={15} color={tint} />
      </XStack>
    </XStack>
  );
}

interface Props {
  busy?: boolean;
  /** Locks the composer once a chat is resolved (B7) — input + send disabled. */
  locked?: boolean;
  /** Uploaded-but-not-sent attachments, previewed above the input row. */
  attachments?: string[];
  onRemoveAttachment?: (url: string) => void;
  onSendText: (text: string) => void;
  onAttach: () => void;
  onAttachDocument: () => void;
  onTyping: () => void;
}

/** Chat input row: staged-attachment previews, attach image/video, attach
 * document, typing-aware text field, send. */
export function SupportChatComposer({
  busy,
  locked,
  attachments,
  onRemoveAttachment,
  onSendText,
  onAttach,
  onAttachDocument,
  onTyping,
}: Readonly<Props>) {
  const { muted, onPrimary, color: ink } = useThemeColors();
  const [text, setText] = useState('');
  const lastTyping = useRef(0);

  if (locked) return null;

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
    if (!body && !attachments?.length) return;
    setText('');
    onSendText(body);
  };

  const previews = attachments?.length ? (
    <XStack gap={8} flexWrap="wrap" paddingHorizontal={12} paddingTop={8}>
      {attachments.map((url, i) => (
        <AttachmentChip key={url} url={url} index={i} tint={muted} onRemove={onRemoveAttachment} />
      ))}
    </XStack>
  ) : null;

  return (
    <YStack>
      {previews}
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
    </YStack>
  );
}
