import { isSameDay } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { formatDate, formatDateTime, formatTime } from '@duncit/datetime';
import { SLOT_PRICE_UNIT_KEY, slotPricingModeOf } from '@duncit/slots';
import type { VenueSlotRow } from '../types';

/** The translator this module and its callers read their copy from. */
export type Translate = ReturnType<typeof useTranslation>['t'];

/** The slot's price as its mode reads it (per slot, per hour, per guest), plus any overtime rate. */
export const priceLabel = (
  slot: { price: number; pricing_mode?: string | null; overtime_rate?: number | null },
  t: Translate
) => {
  if (slot.price <= 0) return t('availability.free');
  const base = t(SLOT_PRICE_UNIT_KEY[slotPricingModeOf(slot.pricing_mode)], { vars: { price: `₹${slot.price}` } });
  const overtime = slot.overtime_rate ?? 0;
  return overtime > 0 ? `${base} ${t('availability.overtimeLabel', { vars: { price: `₹${overtime}` } })}` : base;
};

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
