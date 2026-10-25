import type { PodFormValues } from './types';

type BookingFields = Pick<PodFormValues, 'venue_id' | 'pod_date_time' | 'pod_end_date_time'>;

/** What the author types into an offer: its terms and what it asks of the venue. */
type OfferFields = Pick<PodFormValues, 'venue_offer_model' | 'venue_offer_rate'> &
  Partial<Pick<PodFormValues, 'venue_offer_offerings' | 'venue_offer_note'>>;

/** The venue and window a pod is booked for, as one comparable key. */
export function bookingKeyOf(values: BookingFields): string {
  const iso = (date: Date | null) => (date ? date.toISOString() : '');
  return `${values.venue_id}|${iso(values.pod_date_time)}|${iso(values.pod_end_date_time)}`;
}

/** Anything typed into the offer — terms or an ask — makes it a new offer. */
const typedOffer = (values: OfferFields) =>
  [values.venue_offer_model, values.venue_offer_rate, values.venue_offer_offerings, values.venue_offer_note].some(
    (field) => Boolean(field?.trim()),
  );

/**
 * An edit that leaves the pod's venue and window as they were, and offers no
 * new terms, keeps the booking it already has — so fixing a title never sends
 * the venue a fresh request. Changing the venue or the window, or typing terms
 * or what the host needs from the venue, makes it an offer again.
 */
export function keepsExistingBooking(values: BookingFields & Pick<PodFormValues, 'kept_booking'> & OfferFields): boolean {
  if (!values.kept_booking || typedOffer(values)) return false;
  return values.kept_booking === bookingKeyOf(values);
}
