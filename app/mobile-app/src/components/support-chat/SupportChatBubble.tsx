import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AttachmentView } from '@/components/AttachmentView';
import type { SupportChatMessage } from '@/hooks/useSupportChat';
import { formatTime, tickState } from '@/utils/support-chat';

const TICK_COLOR = { delivered: '#9aa0a6', seen: '#34b7f1' } as const;

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
        <AttachmentView urls={message.attachments} />
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
