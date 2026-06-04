import { Text, XStack, YStack } from 'tamagui';

import type { Ticket } from '@/hooks/useSupport';

const STATUS_TINT: Record<string, string> = {
  OPEN: 'rgba(34,197,94,0.18)',
  PENDING: 'rgba(245,158,11,0.18)',
  RESOLVED: 'rgba(59,130,246,0.18)',
  CLOSED: 'rgba(148,163,184,0.18)',
};

/** A support ticket summary row — subject, status badge and category/count. */
export function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <YStack
      testID={`ticket-${ticket.id}`}
      gap={6}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={14.5} fontWeight="900" color="$color" numberOfLines={1}>
          {ticket.subject}
        </Text>
        <XStack
          borderRadius={999}
          paddingHorizontal={9}
          paddingVertical={3}
          backgroundColor={STATUS_TINT[ticket.status] ?? STATUS_TINT.CLOSED}
        >
          <Text fontSize={10.5} fontWeight="900" color="$color">
            {ticket.status}
          </Text>
        </XStack>
      </XStack>
      <Text fontSize={12} color="$muted">
        {ticket.category} · {ticket.message_count}{' '}
        {ticket.message_count === 1 ? 'message' : 'messages'}
      </Text>
    </YStack>
  );
}
