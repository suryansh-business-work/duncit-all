import { Text, XStack, YStack } from 'tamagui';

import { formatTime } from '@/utils/support-chat';

export interface TicketThreadMessage {
  id: string;
  author_role: string;
  author_name: string;
  body_text: string;
  created_at: string;
}

interface Props {
  message: TicketThreadMessage;
  timeZone: string;
}

/** One ticket message — USER/AGENT bubbles, or a centered SYSTEM timeline line (B7). */
export function TicketMessageBubble({ message, timeZone }: Readonly<Props>) {
  const time = formatTime(message.created_at, timeZone);

  if (message.author_role === 'SYSTEM') {
    return (
      <XStack justifyContent="center" testID={`ticket-msg-${message.id}`}>
        <Text
          fontSize={11.5}
          fontWeight="800"
          color="$muted"
          textAlign="center"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={999}
          paddingHorizontal={10}
          paddingVertical={4}
        >
          {message.body_text}
        </Text>
      </XStack>
    );
  }

  const mine = message.author_role === 'USER';
  return (
    <XStack justifyContent={mine ? 'flex-end' : 'flex-start'} testID={`ticket-msg-${message.id}`}>
      <YStack
        maxWidth="80%"
        padding={10}
        borderRadius={12}
        backgroundColor={mine ? '$primary' : '$surface'}
        borderWidth={mine ? 0 : 1}
        borderColor="$borderColor"
        gap={3}
      >
        <Text fontSize={11} fontWeight="800" color={mine ? '$onPrimary' : '$muted'}>
          {message.author_name}
        </Text>
        <Text fontSize={13.5} color={mine ? '$onPrimary' : '$color'}>
          {message.body_text}
        </Text>
        {time ? (
          <Text
            fontSize={10}
            color={mine ? '$onPrimary' : '$muted'}
            opacity={0.7}
            alignSelf="flex-end"
          >
            {time}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
