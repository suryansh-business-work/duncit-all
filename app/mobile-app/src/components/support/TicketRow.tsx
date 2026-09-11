import { Text, XStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import type { Ticket } from '@/hooks/useSupport';
import { StatusPill } from './StatusPill';

/** A support ticket summary row — subject, status badge and category/count. */
export function TicketRow({ ticket }: Readonly<{ ticket: Ticket }>) {
  return (
    <SurfaceCard testID={`ticket-${ticket.id}`} gap={6}>
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {ticket.subject}
        </Text>
        <StatusPill status={ticket.status} />
      </XStack>
      <Text fontSize={12} color="$muted">
        {ticket.category} · {ticket.message_count}{' '}
        {ticket.message_count === 1 ? 'message' : 'messages'}
      </Text>
    </SurfaceCard>
  );
}
