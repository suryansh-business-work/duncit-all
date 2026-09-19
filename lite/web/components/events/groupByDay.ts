import { dayKeyIn, eventWhen } from '../../../shared/format';

interface Dated {
  start_at: string;
  end_at: string;
  timezone: string;
}

export interface DayGroup<T extends Dated> {
  key: string;
  /** The day as the host's clock shows it, e.g. "Sat, 21 Sep 2026". */
  label: string;
  events: T[];
}

/** Events in the order given, bucketed by the calendar day they start on in their own zone. */
export function groupEventsByDay<T extends Dated>(events: readonly T[]): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();
  for (const event of events) {
    const key = dayKeyIn(event.start_at, event.timezone);
    const existing = groups.get(key);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.set(key, { key, label: eventWhen(event.start_at, event.end_at, event.timezone).date, events: [event] });
    }
  }
  return [...groups.values()];
}
