import type { RefObject } from 'react';
import type { ScrollView } from 'react-native';
import { Text } from 'tamagui';

import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble';
import { ListSkeleton } from '@/components/Skeleton';
import { RefreshScrollView } from '@/components/PullToRefresh';
import type { ChatMessage } from '@/hooks/useChat';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  listRef: RefObject<ScrollView | null>;
  isLoading: boolean;
  messages: ChatMessage[];
  meId?: string | null;
  /** Long press on a bubble: opens that message's actions. */
  onOpenActions: (message: ChatMessage) => void;
}

/** The room's scrolling log — skeleton while it loads, a hello when empty. */
export function ChatMessageList({
  listRef,
  isLoading,
  messages,
  meId,
  onOpenActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (isLoading && messages.length === 0) {
    return <ListSkeleton testID="chat-room-loading" count={5} />;
  }
  return (
    <RefreshScrollView
      ref={listRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
    >
      {messages.length === 0 ? (
        <Text
          testID="chat-room-empty"
          role="status"
          textAlign="center"
          color="$muted"
          paddingVertical={40}
        >
          {t('mweb.chat.noMessagesYet')}
        </Text>
      ) : (
        messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            mine={message.user_id === meId}
            onReact={message.deleted ? undefined : () => onOpenActions(message)}
          />
        ))
      )}
    </RefreshScrollView>
  );
}
