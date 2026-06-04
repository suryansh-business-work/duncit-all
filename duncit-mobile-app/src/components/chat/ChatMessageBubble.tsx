import { Image } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { ChatMessage } from '@/hooks/useChat';

/** A single read-only chat bubble, right-aligned for my own messages. */
export function ChatMessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <XStack justifyContent={mine ? 'flex-end' : 'flex-start'} paddingHorizontal={12}>
      <YStack
        testID={`chat-message-${message.id}`}
        maxWidth="80%"
        gap={4}
        padding={10}
        borderRadius={14}
        borderWidth={1}
        backgroundColor={mine ? '$primary' : '$surface'}
        borderColor={mine ? '$primary' : '$borderColor'}
      >
        {!mine && message.user_name ? (
          <Text fontSize={11} fontWeight="800" color="$muted">
            {message.user_name}
          </Text>
        ) : null}
        {message.image_url ? (
          <Image
            source={{ uri: message.image_url }}
            style={{ width: 180, height: 180, borderRadius: 8 }}
            resizeMode="cover"
          />
        ) : null}
        {message.text ? (
          <Text fontSize={14} color={mine ? '$onPrimary' : '$color'}>
            {message.text}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
