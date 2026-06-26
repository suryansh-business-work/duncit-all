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
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/** The ticket reply thread with day separators and SYSTEM timeline lines (B7/B10). */
export const TicketThread = forwardRef<RNScrollView, Props>(function TicketThread(
  { messages, timeZone, onScroll },
  ref,
) {
  return (
    <ScrollView
      ref={ref}
      flex={1}
      onScroll={onScroll}
      scrollEventThrottle={64}
      contentContainerStyle={{ padding: 16, gap: 10 }}
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
          <TicketMessageBubble message={m} timeZone={timeZone} />
        </YStack>
      ))}
    </ScrollView>
  );
});
