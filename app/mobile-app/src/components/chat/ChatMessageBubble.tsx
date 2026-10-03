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

/** The bubble's alignment, tail and colours for each side of the conversation. */
interface BubbleTone {
  justify: 'flex-end' | 'flex-start';
  ink: Ink;
  /** Faded white on the red fill fails 4.5:1, so the time is solid there. */
  metaInk: Ink;
  bottomRight: number;
  bottomLeft: number;
  fill: '$primary' | '$surface';
  border: '$primary' | '$cardBorder';
}

const MINE_TONE: BubbleTone = {
  justify: 'flex-end',
  ink: '$onPrimary',
  metaInk: '$onPrimary',
  bottomRight: 6,
  bottomLeft: 18,
  fill: '$primary',
  border: '$primary',
};

const THEIRS_TONE: BubbleTone = {
  justify: 'flex-start',
  ink: '$color',
  metaInk: '$muted',
  bottomRight: 18,
  bottomLeft: 6,
  fill: '$surface',
  border: '$cardBorder',
};

/** A single chat bubble: author, text/image, reactions and time. Right-aligned
 * and tinted for my own messages. Long-press opens the reaction picker. */
export function ChatMessageBubble({ message, mine, onReact }: Readonly<ChatMessageBubbleProps>) {
  const { t } = useTranslation();
  const time = formatMessageTime(message.createdAt);
  const reactions = groupReactions(message.reactions);
  const tone = mine ? MINE_TONE : THEIRS_TONE;
  const { ink, metaInk } = tone;
  // One spoken line per message: who, what and when — never a bare "Chat message".
  const spoken = [message.user_name, message.text, time].filter(Boolean).join(', ');

  return (
    <XStack justifyContent={tone.justify} paddingHorizontal={12}>
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
        borderBottomRightRadius={tone.bottomRight}
        borderBottomLeftRadius={tone.bottomLeft}
        borderWidth={1}
        backgroundColor={tone.fill}
        borderColor={tone.border}
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
