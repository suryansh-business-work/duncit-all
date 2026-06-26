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

/** WhatsApp-style delivery indicator for the user's own message (B12):
 * clock = pending, single grey ✓ = Sent/delivered, double blue ✓✓ = Seen. */
function Tick({ id, state }: Readonly<{ id: string; state: 'pending' | 'delivered' | 'seen' }>) {
  if (state === 'pending') {
    return <MaterialIcons testID={`tick-${id}`} name="schedule" size={12} color="#e6e6e6" />;
  }
  const seen = state === 'seen';
  return (
    <MaterialIcons
      testID={`tick-${id}`}
      name={seen ? 'done-all' : 'done'}
      size={13}
      color={TICK_COLOR[state]}
    />
  );
}

interface Props {
  message: SupportChatMessage;
  agentLastReadAt?: string | null;
  timeZone?: string;
  /** Re-send handler for a failed message (B12). */
  onRetry?: (message: SupportChatMessage) => void;
}

export function SupportChatBubble({
  message,
  agentLastReadAt,
  timeZone,
  onRetry,
}: Readonly<Props>) {
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
            {formatTime(message.created_at, timeZone)}
          </Text>
          {tick && tick !== 'failed' ? <Tick id={message.id} state={tick} /> : null}
        </XStack>
        {tick === 'failed' ? (
          <XStack
            testID={`retry-${message.id}`}
            role="button"
            aria-label="Retry sending"
            onPress={() => onRetry?.(message)}
            alignItems="center"
            gap={4}
            alignSelf="flex-end"
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="error-outline" size={13} color="#ff5a5f" />
            <Text fontSize={11} fontWeight="800" color="#ff5a5f">
              Failed · Retry
            </Text>
          </XStack>
        ) : null}
      </YStack>
    </XStack>
  );
}
