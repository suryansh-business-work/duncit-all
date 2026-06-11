import { Image } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { ChatMessage } from '@/hooks/useChat';
import { formatMessageTime, groupReactions } from '@/utils/chat';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
  /** Long-press handler to open the reaction picker for this message. */
  onReact?: (messageId: string) => void;
}

/** Foreground text colour for the bubble — tinted for my own messages. */
type Ink = '$onPrimary' | '$color';

/** Bubble body: a "deleted" placeholder, or the image and/or text content. */
function BubbleBody({
  message,
  mine,
  ink,
}: Readonly<{ message: ChatMessage; mine: boolean; ink: Ink }>) {
  if (message.deleted) {
    return (
      <Text fontSize={14} fontStyle="italic" color={mine ? '$onPrimary' : '$muted'}>
        deleted
      </Text>
    );
  }
  return (
    <>
      {message.image_url ? (
        <Image
          source={{ uri: message.image_url }}
          style={{ width: 180, height: 180, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : null}
      {message.text ? (
        <Text fontSize={14} color={ink}>
          {message.text}
        </Text>
      ) : null}
    </>
  );
}

/** Grouped reaction chips; renders nothing when there are no reactions. */
function BubbleReactions({
  reactions,
  ink,
  messageId,
}: Readonly<{ reactions: ReturnType<typeof groupReactions>; ink: Ink; messageId: string }>) {
  if (reactions.length === 0) return null;
  return (
    <XStack gap={6} flexWrap="wrap">
      {reactions.map((reaction) => (
        <Text
          key={reaction.emoji}
          testID={`reaction-${messageId}-${reaction.emoji}`}
          fontSize={12}
          color={ink}
        >
          {reaction.emoji} {reaction.count}
        </Text>
      ))}
    </XStack>
  );
}

/** A single chat bubble: author, text/image, reactions and time. Right-aligned
 * and tinted for my own messages. Long-press opens the reaction picker. */
export function ChatMessageBubble({ message, mine, onReact }: Readonly<ChatMessageBubbleProps>) {
  const time = formatMessageTime(message.createdAt);
  const reactions = groupReactions(message.reactions);
  const ink: Ink = mine ? '$onPrimary' : '$color';

  return (
    <XStack justifyContent={mine ? 'flex-end' : 'flex-start'} paddingHorizontal={12}>
      <YStack
        testID={`chat-message-${message.id}`}
        role="button"
        aria-label="Chat message"
        onLongPress={onReact ? () => onReact(message.id) : undefined}
        pressStyle={onReact ? { opacity: 0.85 } : undefined}
        maxWidth="80%"
        gap={4}
        padding={10}
        borderRadius={14}
        borderWidth={1}
        backgroundColor={mine ? '$primary' : '$surface'}
        borderColor={mine ? '$primary' : '$borderColor'}
      >
        {!mine && message.user_name ? (
          <Text fontSize={11} fontWeight="800" color="$muted">
            {message.user_name}
          </Text>
        ) : null}

        <BubbleBody message={message} mine={mine} ink={ink} />
        <BubbleReactions reactions={reactions} ink={ink} messageId={message.id} />

        {time ? (
          <Text fontSize={10} opacity={0.7} alignSelf="flex-end" color={ink}>
            {time}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
