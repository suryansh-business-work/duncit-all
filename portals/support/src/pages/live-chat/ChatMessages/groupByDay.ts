import type { SupportChatMessage } from '../../../graphql/supportChat';

export interface DayGroup {
  key: string;
  label: string;
  messages: SupportChatMessage[];
}

/** Groups messages into consecutive calendar-day buckets (in the configured
 * zone) so the thread can render Today / Yesterday / date separators. */
export function groupByDay(
  messages: SupportChatMessage[],
  dayKey: (iso: string) => string,
  dayLabel: (iso: string) => string,
): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const m of messages) {
    const key = dayKey(m.created_at);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.messages.push(m);
    } else {
      groups.push({ key, label: dayLabel(m.created_at), messages: [m] });
    }
  }
  return groups;
}
