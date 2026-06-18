import { Image, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { SupportChatMessage } from '@/hooks/useSupportChat';
import { formatTime, tickState } from '@/utils/support-chat';

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif)$/i;
const TICK_COLOR = { delivered: '#9aa0a6', seen: '#34b7f1' } as const;

function Attachment({ url }: Readonly<{ url: string }>) {
  if (IMAGE_RE.test(url)) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: 180, height: 180, borderRadius: 10 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <XStack
      testID={`support-attach-${url}`}
      role="button"
      aria-label="Open attachment"
      onPress={() => void Linking.openURL(url)}
      alignItems="center"
      gap={6}
      padding={8}
      borderRadius={8}
      backgroundColor="$background"
      pressStyle={{ opacity: 0.8 }}
    >
      <MaterialIcons name="insert-drive-file" size={18} color="#9aa0a6" />
      <Text fontSize={12.5} color="$color">
        Attachment
      </Text>
    </XStack>
  );
}

interface Props {
  message: SupportChatMessage;
  agentLastReadAt?: string | null;
}

export function SupportChatBubble({ message, agentLastReadAt }: Readonly<Props>) {
  if (message.sender_role === 'SYSTEM') {
    return (
      <XStack justifyContent="center" testID={`support-msg-${message.id}`}>
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
          {message.text}
        </Text>
      </XStack>
    );
  }

  const mine = message.sender_role === 'USER';
  const tick = mine ? tickState(message, agentLastReadAt) : null;

  return (
    <XStack justifyContent={mine ? 'flex-end' : 'flex-start'} testID={`support-msg-${message.id}`}>
      <YStack
        maxWidth="80%"
        gap={6}
        padding={10}
        borderRadius={14}
        backgroundColor={mine ? '$primary' : '$surface'}
        borderWidth={mine ? 0 : 1}
        borderColor="$borderColor"
      >
        {!mine && (
          <Text fontSize={11} fontWeight="800" color={message.is_ai ? '$primary' : '$muted'}>
            {message.is_ai ? 'Duncit Assistant' : message.sender_name || 'Support'}
          </Text>
        )}
        {message.attachments.map((url) => (
          <Attachment key={url} url={url} />
        ))}
        {message.text ? (
          <Text fontSize={14} color={mine ? '$onPrimary' : '$color'}>
            {message.text}
          </Text>
        ) : null}
        <XStack justifyContent="flex-end" alignItems="center" gap={4}>
          <Text fontSize={10} color={mine ? '$onPrimary' : '$muted'} opacity={0.7}>
            {formatTime(message.created_at)}
          </Text>
          {tick === 'pending' && (
            <MaterialIcons
              testID={`tick-${message.id}`}
              name="schedule"
              size={12}
              color="#e6e6e6"
            />
          )}
          {tick && tick !== 'pending' && (
            <MaterialIcons
              testID={`tick-${message.id}`}
              name="done-all"
              size={13}
              color={TICK_COLOR[tick]}
            />
          )}
        </XStack>
      </YStack>
    </XStack>
  );
}
