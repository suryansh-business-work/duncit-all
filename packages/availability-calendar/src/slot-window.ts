import { addDays, endOfDay, startOfDay } from 'date-fns';
import type { VenueSlotRow } from './types';

const DAY_MS = 86_400_000;

/**
 * The concrete time window a whole-day booking occupies across
 * [startDate .. endDate] (inclusive). A whole-day slot starting today cannot
 * begin at 00:00 (the server rejects starts in the past), so it begins a few
 * minutes from now instead — the rest of the day is what is actually bookable.
 */
export function wholeDayWindow(
  startDate: Date,
  endDate: Date,
  now: Date = new Date(),
): { start: Date; end: Date } {
  let start = startOfDay(startDate);
  if (start.getTime() <= now.getTime()) {
    start = new Date(now.getTime() + 5 * 60_000);
  }
  return { start, end: endOfDay(endDate) };
}

/**
 * Whether a slot touches a calendar day — the day-cell badges and the day
 * drawer both need this, and `isSameDay(start_at)` misses every later day of a
 * multi-day booking. The slot's end instant is exclusive, so a slot ending
 * exactly at midnight does not claim the next day.
 */
export function slotCoversDay(
  slot: Pick<VenueSlotRow, 'start_at' | 'end_at'>,
  day: Date,
): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + DAY_MS;
  const start = new Date(slot.start_at).getTime();
  const end = new Date(slot.end_at).getTime();
  return start < dayEnd && end > dayStart;
}

/** Every 'yyyy-MM-dd'-keyed calendar day a slot covers, for day bucketing. */
export function slotCoveredDays(slot: Pick<VenueSlotRow, 'start_at' | 'end_at'>): Date[] {
  const start = new Date(slot.start_at);
  const endMs = new Date(slot.end_at).getTime() - 1; // end is exclusive
  const days: Date[] = [];
  const last = startOfDay(new Date(Math.max(start.getTime(), endMs)));
  for (let day = startOfDay(start); day <= last; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}
