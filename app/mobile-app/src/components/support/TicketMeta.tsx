import { Text, XStack, YStack } from 'tamagui';

import { formatDateTime } from '@/utils/date-format';

/** Short ticket number derived from the id — matches the server's ST- scheme. */
export function ticketNo(id: string): string {
  return `ST-${id.slice(-6).toUpperCase()}`;
}

interface MetaRow {
  label: string;
  value: string;
}

interface Props {
  id: string;
  status: string;
  category: string;
  priority?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Header meta for a ticket — number, priority, raised + last-updated dates (Bug 1). */
export function TicketMeta({
  id,
  status,
  category,
  priority,
  createdAt,
  updatedAt,
}: Readonly<Props>) {
  const raised = formatDateTime(createdAt);
  const updated = formatDateTime(updatedAt);
  const rows: MetaRow[] = [];
  if (raised) rows.push({ label: 'Raised', value: raised });
  if (updated) rows.push({ label: 'Last updated', value: updated });

  return (
    <YStack gap={4} testID="ticket-meta">
      <XStack gap={8} flexWrap="wrap" alignItems="center">
        <Text testID="ticket-meta-no" fontSize={12} fontWeight="800" color="$muted">
          {ticketNo(id)}
        </Text>
        <Text fontSize={12} fontWeight="800" color="$muted">
          {category}
        </Text>
        <Text fontSize={12} fontWeight="800" color="$primary">
          {status}
        </Text>
        {priority ? (
          <Text testID="ticket-meta-priority" fontSize={12} fontWeight="800" color="$muted">
            {priority}
          </Text>
        ) : null}
      </XStack>
      {rows.map((r) => (
        <Text key={r.label} fontSize={11.5} color="$muted">
          {r.label}: {r.value}
        </Text>
      ))}
    </YStack>
  );
}
