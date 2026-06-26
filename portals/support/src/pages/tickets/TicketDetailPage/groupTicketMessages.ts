import type { TicketMessage } from '../../../graphql/tickets';

export interface TicketDayGroup {
  key: string;
  label: string;
  messages: TicketMessage[];
}

/** Buckets ticket messages into consecutive calendar-day groups (configured
 * zone) for Today / Yesterday / date separators in the thread. */
export function groupTicketMessages(
  messages: TicketMessage[],
  dayKey: (iso: string) => string,
  dayLabel: (iso: string) => string,
): TicketDayGroup[] {
  const groups: TicketDayGroup[] = [];
  for (const m of messages) {
    const key = dayKey(m.created_at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.messages.push(m);
    } else {
      groups.push({ key, label: dayLabel(m.created_at), messages: [m] });
    }
  }
  return groups;
}
