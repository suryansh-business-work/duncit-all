import { forwardRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView as RNScrollView,
} from 'react-native';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { SupportChatBubble } from '@/components/support-chat/SupportChatBubble';
import type { SupportChatMessage, SupportChatSession } from '@/hooks/useSupportChat';
import { dayLabel, showDaySeparator } from '@/utils/support-chat';

interface Props {
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
  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" testID="support-chat-loading" />
      </YStack>
    );
  }
  if (error) {
    return (
      <Text testID="support-chat-error" color="$muted" textAlign="center" padding={24}>
        {error}
      </Text>
    );
  }

  const typingLine = aiThinking ? 'Duncit Assistant is typing…' : typing;

  return (
    <ScrollView
      ref={ref}
      flex={1}
      onScroll={onScroll}
      scrollEventThrottle={64}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      onContentSizeChange={onContentSizeChange}
    >
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
                fontSize={11}
                fontWeight="800"
                color="$muted"
                textAlign="center"
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
          fontSize={12}
          fontStyle="italic"
          color="$muted"
          paddingHorizontal={4}
        >
          {typingLine}
        </Text>
      ) : null}
    </ScrollView>
  );
});
