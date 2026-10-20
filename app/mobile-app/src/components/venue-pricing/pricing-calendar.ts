import { dayRate } from '@duncit/utils';

import { VenueClosedReason, VenuePricingModel } from '@/generated/graphql/graphql';
import type { SavedPricing } from '@/forms/venue-pricing';
import type { BookingDay } from '@/hooks/useVenueBookingCalendar';

/**
 * What one pricing-calendar day shows — framework-free so the cell, the sheet
 * and the screen read it alike. Blocked and holiday come from what the owner
 * set; booked and closed from the server's booking calendar.
 */
export type DayTag = 'blocked' | 'holiday' | 'booked' | 'closed' | null;

const CLOSED_REASONS = new Set<VenueClosedReason>([
  VenueClosedReason.WeeklyOff,
  VenueClosedReason.Closed,
]);

/** True when anything is booked on the day — such a day is read-only. */
export const isBookedDay = (day: BookingDay | undefined): boolean =>
  !!day && (day.busy.length > 0 || day.slots.some((slot) => !slot.available));

export function dayTagOf(
  dayKey: string,
  day: BookingDay | undefined,
  blocked: ReadonlySet<string>,
  holidays: ReadonlySet<string>,
): DayTag {
  if (isBookedDay(day)) return 'booked';
  if (blocked.has(dayKey)) return 'blocked';
  if (holidays.has(dayKey)) return 'holiday';
  if (day?.closed_reason && CLOSED_REASONS.has(day.closed_reason)) return 'closed';
  return null;
}

/** The day's rate for a non-slot model, after its rules; null for a slot venue or unset pricing. */
export function dayRateOf(pricing: SavedPricing, dayKey: string): number | null {
  if (!pricing.configured || pricing.model === VenuePricingModel.PerSlot) return null;
  return dayRate(pricing.base_rate, pricing.price_rules, dayKey);
}

export const isSlotModel = (pricing: SavedPricing): boolean =>
  pricing.model === VenuePricingModel.PerSlot;
