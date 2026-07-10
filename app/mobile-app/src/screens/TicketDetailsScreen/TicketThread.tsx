import { forwardRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView as RNScrollView,
} from 'react-native';
import { ScrollView, Text, YStack } from 'tamagui';

import {
  TicketMessageBubble,
  type TicketThreadMessage,
} from '@/components/support/TicketMessageBubble';
import { dayLabel, showDaySeparator } from '@/utils/support-chat';

interface Props {
  messages: TicketThreadMessage[];
  timeZone: string;
  agentLastReadAt?: string | null;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Auto-follows the newest reply while the thread is pinned to the bottom. */
  onContentSizeChange: () => void;
}

/** The ticket reply thread with day separators and SYSTEM timeline lines (B7/B10). */
export const TicketThread = forwardRef<RNScrollView, Props>(function TicketThread(
  { messages, timeZone, agentLastReadAt, onScroll, onContentSizeChange },
  ref,
) {
  return (
    <ScrollView
      ref={ref}
      flex={1}
      onScroll={onScroll}
      scrollEventThrottle={64}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      onContentSizeChange={onContentSizeChange}
    >
      {messages.map((m, i) => (
        <YStack key={m.id} gap={6}>
          {showDaySeparator(m.created_at, messages[i - 1]?.created_at, timeZone) && m.created_at ? (
            <Text
              testID={`ticket-day-${m.id}`}
              fontSize={11}
              fontWeight="800"
              color="$muted"
              textAlign="center"
            >
              {dayLabel(m.created_at, timeZone)}
            </Text>
          ) : null}
          <TicketMessageBubble message={m} timeZone={timeZone} agentLastReadAt={agentLastReadAt} />
        </YStack>
      ))}
    </ScrollView>
  );
});
