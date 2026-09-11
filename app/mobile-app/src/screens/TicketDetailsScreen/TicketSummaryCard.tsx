import { Text } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { TicketMeta } from '@/components/support/TicketMeta';
import type { TicketDetail } from '@/hooks/useUnifiedTickets';

/** The ticket's subject and meta (number, status, priority, dates) in one card. */
export function TicketSummaryCard({ ticket }: Readonly<{ ticket: TicketDetail }>) {
  return (
    <SurfaceCard marginHorizontal={16} marginTop={4} gap={6}>
      <Text fontSize={16} fontWeight="600" color="$color">
        {ticket.subject}
      </Text>
      <TicketMeta
        id={ticket.id}
        status={ticket.status}
        category={ticket.category}
        priority={ticket.priority}
        createdAt={ticket.created_at}
        updatedAt={ticket.updated_at ?? ticket.last_message_at}
      />
    </SurfaceCard>
  );
}
