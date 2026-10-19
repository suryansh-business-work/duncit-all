import { forwardRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView as RNScrollView,
} from 'react-native';
import { Spinner, Text, YStack } from 'tamagui';

import { ChatHistoryTop } from '@/components/chat/ChatHistoryTop';
import { SupportChatBubble } from '@/components/support-chat/SupportChatBubble';
import type { ChatHistory } from '@/hooks/useChatHistory';
import type { SupportChatMessage, SupportChatSession } from '@/hooks/useSupportChat';
import { dayLabel, showDaySeparator } from '@/utils/support-chat';
import { fireAndForget } from '@/utils/fire-and-forget';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useLoadingRegion } from '@/components/Skeleton';

/** Keeps the line being read in place when an older page lands above it. */
const KEEP_POSITION = { minIndexForVisible: 0 } as const;

interface Props {
  /** Scroll-up history: the spinner / "show earlier" control at the top. */
  history: ChatHistory;
  isLoading: boolean;
  error: string;
  messages: SupportChatMessage[];
  session: SupportChatSession | null;
  timeZone: string;
  typing: string;
  aiThinking: boolean;
  onRetry: (message: SupportChatMessage) => void;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onContentSizeChange: () => void;
}

/** The scrollable chat transcript: day separators, bubbles and the typing line. */
export const ChatBody = forwardRef<RNScrollView, Props>(function ChatBody(
  {
    history,
    isLoading,
    error,
    messages,
    session,
    timeZone,
    typing,
    aiThinking,
    onRetry,
    onScroll,
    onContentSizeChange,
  },
  ref,
) {
  const loadingRegion = useLoadingRegion();
  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" {...loadingRegion}>
        <Spinner size="large" testID="support-chat-loading" />
      </YStack>
    );
  }
  if (error) {
    return (
      <Text testID="support-chat-error" role="alert" color="$muted" textAlign="center" padding={24}>
        {error}
      </Text>
    );
  }

  const typingLine = aiThinking ? 'Duncit Assistant is typing…' : typing;

  return (
    <RefreshScrollView
      ref={ref}
      testID="support-chat-list"
      flex={1}
      onScroll={onScroll}
      scrollEventThrottle={64}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      onContentSizeChange={onContentSizeChange}
      maintainVisibleContentPosition={KEEP_POSITION}
    >
      <ChatHistoryTop
        testIDPrefix="support-chat"
        loading={history.loadingOlder}
        failed={history.olderFailed}
        hasOlder={history.hasOlder}
        onLoadOlder={() => fireAndForget(history.loadOlder())}
      />
      {messages.length === 0 ? (
        <Text testID="support-chat-empty" color="$muted" textAlign="center" padding={24}>
          Say hello — our assistant replies instantly and connects you to a human when needed.
        </Text>
      ) : (
        messages.map((m, i) => (
          <YStack key={m.id} gap={6}>
            {showDaySeparator(m.created_at, messages[i - 1]?.created_at, timeZone) && (
              <Text
                testID={`day-${m.id}`}
                alignSelf="center"
                fontSize={11}
                fontWeight="600"
                color="$muted"
                textAlign="center"
                backgroundColor="$soft"
                borderRadius={999}
                overflow="hidden"
                paddingHorizontal={10}
                paddingVertical={3}
              >
                {dayLabel(m.created_at, timeZone)}
              </Text>
            )}
            <SupportChatBubble
              message={m}
              agentLastReadAt={session?.agent_last_read_at}
              timeZone={timeZone}
              onRetry={onRetry}
            />
          </YStack>
        ))
      )}
      {typingLine ? (
        <Text
          testID="support-typing"
          role="status"
          fontSize={12}
          fontStyle="italic"
          color="$muted"
          paddingHorizontal={4}
        >
          {typingLine}
        </Text>
      ) : null}
    </RefreshScrollView>
  );
});
