import { AppImage } from '@/components/AppImage';

import { Text, XStack, YStack } from 'tamagui';

import type { ChatMessage } from '@/hooks/useChat';
import { formatMessageTime, groupReactions } from '@/utils/chat';
import { useTranslation } from '@/hooks/useTranslation';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
  /** Long-press handler to open the reaction picker for this message. */
  onReact?: (messageId: string) => void;
}

/** Foreground text colour for the bubble — tinted for my own messages. */
type Ink = '$onPrimary' | '$color' | '$muted';

/** Bubble body: a "deleted" placeholder, or the image and/or text content. */
function BubbleBody({
  message,
  mine,
  ink,
  imageLabel,
}: Readonly<{ message: ChatMessage; mine: boolean; ink: Ink; imageLabel: string }>) {
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
        <AppImage
          source={{ uri: message.image_url }}
          accessibilityLabel={imageLabel}
          style={{ width: 180, height: 180, borderRadius: 12 }}
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
  const { t } = useTranslation();
  const time = formatMessageTime(message.createdAt);
  const reactions = groupReactions(message.reactions);
  const ink: Ink = mine ? '$onPrimary' : '$color';
  // Faded white on the red fill fails 4.5:1, so the time is solid there.
  const metaInk: Ink = mine ? '$onPrimary' : '$muted';
  // One spoken line per message: who, what and when — never a bare "Chat message".
  const spoken = [message.user_name, message.text, time].filter(Boolean).join(', ');

  return (
    <XStack justifyContent={mine ? 'flex-end' : 'flex-start'} paddingHorizontal={12}>
      <YStack
        testID={`chat-message-${message.id}`}
        role="button"
        aria-label={`${t('mweb.chat.chatMessage')}: ${spoken}`}
        tabIndex={0}
        onLongPress={onReact ? () => onReact(message.id) : undefined}
        pressStyle={onReact ? { opacity: 0.85 } : undefined}
        maxWidth="80%"
        gap={4}
        paddingHorizontal={12}
        paddingVertical={8}
        borderRadius={18}
        borderBottomRightRadius={mine ? 6 : 18}
        borderBottomLeftRadius={mine ? 18 : 6}
        borderWidth={1}
        backgroundColor={mine ? '$primary' : '$surface'}
        borderColor={mine ? '$primary' : '$cardBorder'}
      >
        {!mine && message.user_name ? (
          <Text fontSize={12} fontWeight="600" color="$muted">
            {message.user_name}
          </Text>
        ) : null}

        <BubbleBody message={message} mine={mine} ink={ink} imageLabel={t('mweb.chatRoom.image')} />
        <BubbleReactions reactions={reactions} ink={ink} messageId={message.id} />

        {time ? (
          <Text fontSize={10} alignSelf="flex-end" color={metaInk}>
            {time}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
