import { isSameDay } from 'date-fns';
import { formatMoney } from '@duncit/utils';

import type { Translate } from '@/i18n/fallback';
import { formatDate, formatDateTime, formatTime } from '@/utils/date-format';

interface SlotSpan {
  start_at: string;
  end_at: string;
  whole_day?: boolean | null;
}

/**
 * "10:00 AM – 06:00 PM", or the date-aware / whole-day variants for slots
 * that span days or book the entire date(s) — the same sentences the MUI slot
 * list prints, in the admin's date and time formats (rules 11 + 27).
 */
export function slotWhenLabel(slot: SlotSpan, t: Translate): string {
  const start = new Date(slot.start_at);
  // The end instant is exclusive: ending exactly at midnight claims no extra day.
  const end = new Date(slot.end_at);
  const multiDay = !isSameDay(start, new Date(end.getTime() - 1));
  if (slot.whole_day) {
    if (!multiDay) return t('availability.wholeDay');
    return t('availability.wholeDayRange', {
      vars: { from: formatDate(start), to: formatDate(end) },
    });
  }
  const stamp = multiDay ? formatDateTime : formatTime;
  return t('availability.timeRange', { vars: { from: stamp(start), to: stamp(end) } });
}

/** "₹399", or the word for a free slot. */
export const slotPriceLabel = (price: number, t: Translate): string =>
  price > 0 ? formatMoney(price) : t('availability.free');

/** "Court 1 · holds 4" — the capacity is what tells two courts apart. */
export function spaceOptionLabel(space: { label: string; capacity: number }, t: Translate): string {
  const label = space.label || t('availability.wholeVenue');
  if (space.capacity <= 0) return label;
  return t('availability.spaceHolds', { vars: { label, capacity: space.capacity } });
}
