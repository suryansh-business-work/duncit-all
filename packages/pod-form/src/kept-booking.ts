import type { PodFormValues } from './types';

type BookingFields = Pick<PodFormValues, 'venue_id' | 'pod_date_time' | 'pod_end_date_time'>;

/** The venue and window a pod is booked for, as one comparable key. */
export function bookingKeyOf(values: BookingFields): string {
  const iso = (date: Date | null) => (date ? date.toISOString() : '');
  return `${values.venue_id}|${iso(values.pod_date_time)}|${iso(values.pod_end_date_time)}`;
}

/**
 * An edit that leaves the pod's venue and window as they were, and offers no
 * new terms, keeps the booking it already has — so fixing a title never sends
 * the venue a fresh request. Changing the venue or the window, or typing terms,
 * makes it an offer again.
 */
export function keepsExistingBooking(
  values: BookingFields & Pick<PodFormValues, 'kept_booking' | 'venue_offer_model' | 'venue_offer_rate'>,
): boolean {
  if (!values.kept_booking || values.venue_offer_model || values.venue_offer_rate) return false;
  return values.kept_booking === bookingKeyOf(values);
}
