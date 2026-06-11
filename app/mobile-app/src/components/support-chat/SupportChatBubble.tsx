import { Image } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { SupportChatMessage } from '@/hooks/useSupportChat';

/** One Chat with Us message — user right, agent left, SYSTEM centered
 * (e.g. "Picked up by Agent Name"). */
export function SupportChatBubble({ message }: Readonly<{ message: SupportChatMessage }>) {
  if (message.sender_role === 'SYSTEM') {
    return (
      <XStack justifyContent="center" testID={`support-msg-${message.id}`}>
        <Text
          fontSize={11.5}
          fontWeight="800"
          color="$muted"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius={999}
          paddingHorizontal={10}
          paddingVertical={4}
        >
          {message.text}
        </Text>
      </XStack>
    );
  }

  const mine = message.sender_role === 'USER';
  return (
    <XStack justifyContent={mine ? 'flex-end' : 'flex-start'} testID={`support-msg-${message.id}`}>
      <YStack
        maxWidth="78%"
        gap={6}
        padding={10}
        borderRadius={14}
        backgroundColor={mine ? '$primary' : '$surface'}
        borderWidth={mine ? 0 : 1}
        borderColor="$borderColor"
      >
        {!mine && (
          <Text fontSize={11} fontWeight="800" color="$muted">
            {message.sender_name || 'Support'}
          </Text>
        )}
        {message.attachments.map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            style={{ width: 180, height: 180, borderRadius: 10 }}
            resizeMode="cover"
          />
        ))}
        {message.text ? (
          <Text fontSize={14} color={mine ? '$onPrimary' : '$color'}>
            {message.text}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
