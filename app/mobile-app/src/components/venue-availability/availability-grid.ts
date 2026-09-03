import { addDays, endOfMonth, format, startOfDay, startOfMonth } from 'date-fns';
import { MAX_FUTURE_DAYS, slotCoveredDays, slotCoversDay } from '@duncit/slots';

/**
 * The availability month grid's arithmetic — framework-free, so the grid, the
 * day sheet and the screen all read the same day keys and the same counts.
 * Day keys are 'yyyy-MM-dd' in the device zone, exactly as the MUI calendar
 * in @duncit/availability-calendar buckets them (rule 27).
 */

/** What a day cell shows: one count per slot status. */
export interface DayCounts {
  available: number;
  pending: number;
  booked: number;
  blocked: number;
}

/** The slot fields the grid reads — the `venueSlots` row satisfies it. */
export interface DaySlot {
  start_at: string;
  end_at: string;
  status: string;
  space_label?: string | null;
}

const DAY_KEY_PATTERN = 'yyyy-MM-dd';

export const dayKeyOf = (date: Date): string => format(date, DAY_KEY_PATTERN);

/** A day key as a local midnight — never `new Date(key)`, which reads UTC. */
export const dayFromKey = (dayKey: string): Date => new Date(`${dayKey}T00:00:00`);

/** ISO bounds of a 'yyyy-MM' month, for the slots query. */
export function monthRange(monthKey: string): { from: string; to: string } {
  const first = dayFromKey(`${monthKey}-01`);
  return { from: startOfMonth(first).toISOString(), to: endOfMonth(first).toISOString() };
}

const emptyCounts = (): DayCounts => ({ available: 0, pending: 0, booked: 0, blocked: 0 });

const COUNT_FIELD: Record<string, keyof DayCounts> = {
  AVAILABLE: 'available',
  PENDING: 'pending',
  BOOKED: 'booked',
  BLOCKED: 'blocked',
};

/** A / P / B / × per calendar day. A multi-day slot counts on EVERY day it
 * covers, so the block is visible across the whole range. */
export function countSlotsByDay(slots: readonly DaySlot[]): Map<string, DayCounts> {
  const map = new Map<string, DayCounts>();
  for (const slot of slots) {
    const field = COUNT_FIELD[slot.status] ?? 'blocked';
    for (const day of slotCoveredDays(slot)) {
      const key = dayKeyOf(day);
      const counts = map.get(key) ?? emptyCounts();
      counts[field] += 1;
      map.set(key, counts);
    }
  }
  return map;
}

/** The last day availability may be published on — the server's window. */
export const lastPublishableDay = (now: Date): string =>
  dayKeyOf(addDays(startOfDay(now), MAX_FUTURE_DAYS));

/** `disabled` = past or beyond the window, read-only. A holiday still opens,
 * so the owner can see what is on it, but nothing can be added. */
export type DayCellState = 'open' | 'holiday' | 'disabled';

export function dayCellState(
  dayKey: string,
  todayKey: string,
  lastKey: string,
  holidays: ReadonlySet<string>,
): DayCellState {
  if (dayKey < todayKey || dayKey > lastKey) return 'disabled';
  if (holidays.has(dayKey)) return 'holiday';
  return 'open';
}

/**
 * Space first, then time: a venue with ten courts publishes ten slots for the
 * same hour, and chronological order interleaves them into a list where no
 * court's own day is readable. `slotCoversDay` rather than a start-date match,
 * so a multi-day booking appears on every day it spans.
 */
export function slotsOnDay<T extends DaySlot>(slots: readonly T[], dayKey: string): T[] {
  const day = dayFromKey(dayKey);
  const matching = slots.filter((slot) => slotCoversDay(slot, day));
  matching.sort((a, b) => {
    const bySpace = (a.space_label ?? '').localeCompare(b.space_label ?? '');
    if (bySpace !== 0) return bySpace;
    return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
  });
  return matching;
}
