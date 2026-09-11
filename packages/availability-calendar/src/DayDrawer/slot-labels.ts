import { isSameDay } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { formatDate, formatDateTime, formatTime } from '@duncit/datetime';
import type { VenueSlotRow } from '../types';

/** The translator this module and its callers read their copy from. */
export type Translate = ReturnType<typeof useTranslation>['t'];

export const priceLabel = (price: number, t: Translate) =>
  price > 0 ? `₹${price}` : t('availability.free');

export const STATUS_COLOR: Record<VenueSlotRow['status'], 'success' | 'info' | 'warning' | 'default'> = {
  AVAILABLE: 'success',
  PENDING: 'info',
  BOOKED: 'warning',
  BLOCKED: 'default',
};

// PENDING = a live booking request; decide it in Slot Requests, don't edit it.
export const LOCKED_STATUSES = new Set<VenueSlotRow['status']>(['BOOKED', 'PENDING']);

/** "10:00 AM – 06:00 PM", or the date-aware / whole-day variants for slots
 * that span days or book the entire date(s). */
export function slotWhenLabel(
  slot: Pick<VenueSlotRow, 'start_at' | 'end_at' | 'whole_day'>,
  t: Translate,
): string {
  const start = new Date(slot.start_at);
  const end = new Date(slot.end_at);
  // The end instant is exclusive: ending exactly at midnight claims no extra day.
  const multiDay = !isSameDay(start, new Date(end.getTime() - 1));
  if (slot.whole_day) {
    if (!multiDay) return t('availability.wholeDay');
    return t('availability.wholeDayRange', {
      vars: { from: formatDate(start), to: formatDate(end) },
    });
  }
  if (multiDay) {
    return t('availability.timeRange', {
      vars: { from: formatDateTime(start), to: formatDateTime(end) },
    });
  }
  return t('availability.timeRange', {
    vars: { from: formatTime(start), to: formatTime(end) },
  });
}
