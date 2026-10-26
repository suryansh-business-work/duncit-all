import { AppImage } from '@/components/AppImage';

import { Text, XStack, YStack } from 'tamagui';

import type { ChatMessage } from '@/hooks/useChat';
import { formatMessageTime } from '@/utils/chat';
import { useTranslation } from '@/hooks/useTranslation';
import { ChatLineMeta, type LineInk } from '@/components/chat/ChatLineMeta';
import { ChatMessageQuote } from '@/components/chat/ChatMessageQuote';
import { ChatMessageText } from '@/components/chat/ChatMessageText';
import { SwipeToReply } from '@/components/chat/SwipeToReply';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
  /** Long-press handler: opens this message's actions (react, reply, delete, report). */
  onReact?: (messageId: string) => void;
  /** Swipe right: answer this message. Absent when replying is not possible. */
  onReply?: (messageId: string) => void;
  /** A reply's quote was tapped: show the original. */
  onJumpTo?: (messageId: string) => void;
  /** A highlighted @mention was tapped. */
  onOpenProfile?: (userId: string) => void;
  /** When it was sent, written out by the thread (a venue chat names the date too); its HH:mm when omitted. */
  timeLabel?: string;
  /** Its author changed it after sending. */
  edited?: boolean;
  /** The reader, whose own reactions are drawn picked. */
  viewerId?: string | null;
  /** Tapping a reaction chip toggles the reader's reaction. Absent: the chips only show. */
  onToggleReaction?: (emoji: string) => void;
}

/** Bubble body: a "deleted" placeholder, or the image and/or text content. */
function BubbleBody({
  message,
  mine,
  ink,
  imageLabel,
  onOpenProfile,
}: Readonly<{
  message: ChatMessage;
  mine: boolean;
  ink: LineInk;
  imageLabel: string;
  onOpenProfile?: (userId: string) => void;
}>) {
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
        <ChatMessageText
          text={message.text}
          ink={ink}
          mentioned={message.mention_users}
          onOpenProfile={onOpenProfile}
        />
      ) : null}
    </>
  );
}

/** The bubble's alignment, tail and colours for each side of the conversation. */
interface BubbleTone {
  justify: 'flex-end' | 'flex-start';
  ink: LineInk;
  /** Faded white on the red fill fails 4.5:1, so the time is solid there. */
  metaInk: LineInk;
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
export function ChatMessageBubble({
  message,
  mine,
  onReact,
  onReply,
  onJumpTo,
  onOpenProfile,
  timeLabel,
  edited = false,
  viewerId,
  onToggleReaction,
}: Readonly<ChatMessageBubbleProps>) {
  const { t } = useTranslation();
  const time = timeLabel ?? formatMessageTime(message.createdAt);
  const tone = mine ? MINE_TONE : THEIRS_TONE;
  const { ink, metaInk } = tone;
  // One spoken line per message: who, what and when — never a bare "Chat message".
  const spoken = [message.user_name, message.text, time].filter(Boolean).join(', ');

  const quote = message.deleted ? null : message.reply_to;

  return (
    <SwipeToReply onReply={onReply && !message.deleted ? () => onReply(message.id) : undefined}>
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

          {quote ? (
            <ChatMessageQuote quote={quote} mine={mine} onJump={(id) => onJumpTo?.(id)} />
          ) : null}
          <BubbleBody
            message={message}
            mine={mine}
            ink={ink}
            imageLabel={t('mweb.chatRoom.image')}
            onOpenProfile={onOpenProfile}
          />
          <ChatLineMeta
            messageId={message.id}
            reactions={message.reactions}
            time={time}
            edited={edited && !message.deleted}
            ink={ink}
            metaInk={metaInk}
            viewerId={viewerId}
            onToggleReaction={message.deleted ? undefined : onToggleReaction}
          />
        </YStack>
      </XStack>
    </SwipeToReply>
  );
}
