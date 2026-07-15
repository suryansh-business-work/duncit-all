import { MaterialIcons } from '@expo/vector-icons';
import { Input, Spinner, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  onToggleEmoji: () => void;
  sending: boolean;
}

/** Message composer: image picker, text input, emoji toggle and send button.
 * RN twin of mWeb's MessageComposer. */
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onPickImage,
  onToggleEmoji,
  sending,
}: Readonly<ChatComposerProps>) {
  const { muted, onPrimary } = useThemeColors();
  const canSend = value.trim().length > 0;

  return (
    <XStack
      alignItems="center"
      gap={6}
      paddingHorizontal={10}
      paddingVertical={8}
      backgroundColor="$surface"
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      <XStack
        testID="chat-pick-image"
        role="button"
        aria-label="Send image"
        aria-disabled={sending}
        onPress={sending ? undefined : onPickImage}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        borderRadius={20}
        opacity={sending ? 0.5 : 1}
        pressStyle={{ opacity: 0.6 }}
      >
        {sending ? (
          <Spinner color="$muted" />
        ) : (
          <MaterialIcons name="image" size={24} color={muted} />
        )}
      </XStack>

      <Input
        testID="chat-input"
        aria-label="Message"
        flex={1}
        value={value}
        onChangeText={onChangeText}
        placeholder="Type a message"
        placeholderTextColor="$muted"
        multiline
        maxLength={2000}
        maxHeight={120}
        backgroundColor="$background"
        borderColor="$borderColor"
        color="$color"
        borderRadius={20}
      />

      <XStack
        testID="chat-emoji-toggle"
        role="button"
        aria-label="Emoji"
        onPress={onToggleEmoji}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        borderRadius={20}
        pressStyle={{ opacity: 0.6 }}
      >
        <MaterialIcons name="emoji-emotions" size={24} color={muted} />
      </XStack>

      <XStack
        testID="chat-send"
        role="button"
        aria-label="Send message"
        aria-disabled={!canSend}
        onPress={canSend ? onSend : undefined}
        width={44}
        height={44}
        alignItems="center"
        justifyContent="center"
        borderRadius={22}
        backgroundColor={canSend ? '$primary' : '$borderColor'}
        opacity={canSend ? 1 : 0.6}
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="send" size={20} color={onPrimary} />
      </XStack>
    </XStack>
  );
}
