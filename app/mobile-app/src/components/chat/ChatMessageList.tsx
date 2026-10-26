import { useRef, type ReactNode, type RefObject } from 'react';
import type { ScrollView } from 'react-native';
import { Text, YStack } from 'tamagui';

import { ChatHistoryTop } from '@/components/chat/ChatHistoryTop';
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ListSkeleton } from '@/components/Skeleton';
import { RefreshScrollView } from '@/components/PullToRefresh';
import type { ChatMessage } from '@/hooks/useChat';
import type { ChatHistory } from '@/hooks/useChatHistory';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

/** Keeps the line being read in place when an older page lands above it. */
const KEEP_POSITION = { minIndexForVisible: 0 } as const;

interface Props<M extends ChatMessage> {
  listRef: RefObject<ScrollView | null>;
  isLoading: boolean;
  messages: M[];
  /** Scroll-up history: older pages load as the reader nears the top. */
  history: ChatHistory;
  meId?: string | null;
  /** Long press on a bubble: opens that message's actions. Absent in a thread
   * that draws its own lines (a venue chat). */
  onOpenActions?: (message: M) => void;
  /** Swipe right on a bubble: answer it. Absent in a closed room. */
  onReply?: (messageId: string) => void;
  /** A highlighted @mention was tapped. */
  onOpenProfile?: (userId: string) => void;
  /** The sentence an empty room shows; the group chat's when omitted. */
  emptyText?: string;
  /** Draws a line its own way (a venue chat's lines and offer cards); null keeps the bubble. */
  renderMessage?: (message: M) => ReactNode;
}

/** Room left above a line scrolled to from a quote, so it is not under the header. */
const JUMP_MARGIN = 80;

/** The room's scrolling log — skeleton while it loads, a hello when empty. Generic
 * over the line type, so a thread whose lines carry more (a venue chat's offer
 * moves) hands its own lines back to `renderMessage`. */
export function ChatMessageList<M extends ChatMessage>({
  listRef,
  isLoading,
  messages,
  history,
  meId,
  onOpenActions,
  onReply,
  onOpenProfile,
  emptyText,
  renderMessage,
}: Readonly<Props<M>>) {
  const { t } = useTranslation();
  // Where each loaded line sits in the list, so a quote can scroll to its original.
  const positions = useRef(new Map<string, number>());
  const jumpTo = (messageId: string) => {
    const y = positions.current.get(messageId);
    if (y !== undefined)
      listRef.current?.scrollTo({ y: Math.max(0, y - JUMP_MARGIN), animated: true });
  };
  if (isLoading && messages.length === 0) {
    return <ListSkeleton testID="chat-room-loading" count={5} />;
  }
  return (
    <RefreshScrollView
      ref={listRef}
      testID="chat-room-list"
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
      onScroll={history.onScroll}
      scrollEventThrottle={64}
      maintainVisibleContentPosition={KEEP_POSITION}
    >
      <ChatHistoryTop
        testIDPrefix="chat-room"
        loading={history.loadingOlder}
        failed={history.olderFailed}
        hasOlder={history.hasOlder}
        onLoadOlder={() => fireAndForget(history.loadOlder())}
      />
      {messages.length === 0 ? (
        <Text
          testID="chat-room-empty"
          role="status"
          textAlign="center"
          color="$muted"
          paddingVertical={40}
        >
          {emptyText ?? t('mweb.chat.noMessagesYet')}
        </Text>
      ) : (
        messages.map((message) => (
          <YStack
            key={message.id}
            onLayout={(e) => positions.current.set(message.id, e.nativeEvent.layout.y)}
          >
            {renderMessage?.(message) ?? (
              <ChatMessageBubble
                message={message}
                mine={message.user_id === meId}
                onReact={
                  message.deleted || !onOpenActions ? undefined : () => onOpenActions(message)
                }
                onReply={onReply}
                onJumpTo={jumpTo}
                onOpenProfile={onOpenProfile}
              />
            )}
          </YStack>
        ))
      )}
    </RefreshScrollView>
  );
}
