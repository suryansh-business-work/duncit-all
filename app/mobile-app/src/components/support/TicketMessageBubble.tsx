import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AttachmentView } from '@/components/AttachmentView';
import { formatTime, tickState } from '@/utils/support-chat';

const TICK_COLOR = { delivered: '#9aa0a6', seen: '#34b7f1' } as const;

export interface TicketThreadMessage {
  id: string;
  author_role: string;
  author_name: string;
  body_text: string;
  attachments: string[];
  created_at: string;
}

interface Props {
  message: TicketThreadMessage;
  timeZone: string;
  /** When the support agent last opened the thread — flips the user's Sent ticks to Seen (B12). */
  agentLastReadAt?: string | null;
}

/** A SYSTEM event (status change, assignment…) — a centered timeline line rather
 * than a bubble (B7). */
function SystemLine({ id, text }: Readonly<{ id: string; text: string }>) {
  return (
    <XStack justifyContent="center" testID={`ticket-msg-${id}`}>
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
        {text}
      </Text>
    </XStack>
  );
}

/** One ticket message — USER/AGENT bubbles, or a centered SYSTEM timeline line (B7).
 * The user's own messages carry a Sent (✓) / Seen (✓✓) tick like the live chat (B12). */
export function TicketMessageBubble({ message, timeZone, agentLastReadAt }: Readonly<Props>) {
  if (message.author_role === 'SYSTEM') {
    return <SystemLine id={message.id} text={message.body_text} />;
  }

  const time = formatTime(message.created_at, timeZone);
  const mine = message.author_role === 'USER';
  const seen = mine && tickState(message, agentLastReadAt) === 'seen';
  // Every `mine`-derived value is resolved once here, so the JSX below stays flat.
  const ink = mine ? '$onPrimary' : '$color';
  const subtleInk = mine ? '$onPrimary' : '$muted';

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
        <Text fontSize={11} fontWeight="800" color={subtleInk}>
          {message.author_name}
        </Text>
        <AttachmentView urls={message.attachments} size={120} />
        {message.body_text ? (
          <Text fontSize={13.5} color={ink}>
            {message.body_text}
          </Text>
        ) : null}
        <XStack alignSelf="flex-end" alignItems="center" gap={4}>
          {time ? (
            <Text fontSize={10} color={subtleInk} opacity={0.7}>
              {time}
            </Text>
          ) : null}
          {mine ? (
            <MaterialIcons
              testID={`ticket-tick-${message.id}`}
              name={seen ? 'done-all' : 'done'}
              size={13}
              color={seen ? TICK_COLOR.seen : TICK_COLOR.delivered}
            />
          ) : null}
        </XStack>
      </YStack>
    </XStack>
  );
}
