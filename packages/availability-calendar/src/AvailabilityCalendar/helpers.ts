import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import { slotCoveredDays } from '@duncit/slots';
import type { CalendarView, VenueSlotRow } from '../types';

export interface Bucket {
  available: number;
  pending: number;
  booked: number;
  blocked: number;
}

export function bucketByDay(slots: VenueSlotRow[]): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  for (const slot of slots) {
    // A multi-day (activity) slot counts on EVERY day it covers, so the block
    // is visible across the whole range, not just its start date.
    for (const day of slotCoveredDays(slot)) {
      const key = format(day, 'yyyy-MM-dd');
      const bucket = map.get(key) ?? { available: 0, pending: 0, booked: 0, blocked: 0 };
      if (slot.status === 'AVAILABLE') bucket.available += 1;
      else if (slot.status === 'PENDING') bucket.pending += 1;
      else if (slot.status === 'BOOKED') bucket.booked += 1;
      else bucket.blocked += 1;
      map.set(key, bucket);
    }
  }
  return map;
}

// Flat (non-nested) colour resolution keeps the JSX free of nested ternaries.
export function cellColors(isSelected: boolean, isOtherMonth: boolean, isDisabled: boolean, isHoliday: boolean) {
  if (isSelected) return { bgcolor: 'primary.main', color: 'primary.contrastText' };
  // Other-month days stay bookable, so they are real text (1.4.3): the transparent
  // ground, not a faded ink, is what sets them apart.
  if (isOtherMonth) return { bgcolor: 'transparent', color: 'text.secondary' };
  // The .main shades carry a contrastText that is AA in both modes; the .light
  // shades under that same ink fell to ~3.9:1 on the 10px badge copy (1.4.3).
  if (isHoliday) return { bgcolor: 'error.main', color: 'error.contrastText' };
  if (isDisabled) return { bgcolor: 'background.paper', color: 'text.disabled' };
  return { bgcolor: 'background.paper', color: 'text.primary' };
}

// Flat geometry/interaction resolution keeps the day-cell `sx` free of ternaries.
export function cellShape(isDayView: boolean, isSelected: boolean, isDisabled: boolean) {
  return {
    aspectRatio: isDayView ? undefined : '1 / 1',
    minHeight: isDayView ? 120 : undefined,
    borderColor: isSelected ? 'primary.main' : 'divider',
    // Past and beyond-window days are read-only — dimmed and non-interactive.
    cursor: isDisabled ? 'default' : 'pointer',
    hoverBorderColor: isDisabled ? 'divider' : 'primary.main',
  } as const;
}

// Stable keys for the weekday header: the translated labels may repeat.
export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// The visible day cells for the active view: a single day, the anchor's week, or
// the full 6×7 month grid.
export function buildCells(view: CalendarView, month: Date, anchor: Date): Date[] {
  if (view === 'day') return [anchor];
  if (view === 'week') {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const cells: Date[] = [];
  let cursor = gridStart;
  // 6 rows × 7 cols always fits any month.
  for (let i = 0; i < 42; i += 1) {
    cells.push(cursor);
    cursor = addDays(cursor, 1);
    if (i >= 28 && cursor > monthEnd && cursor.getDay() === 0) break;
  }
  return cells;
}
