import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { instantBookingInput, type InstantBooking } from '@duncit/utils';
import type { CreatePodForm } from './create-pod.types';
import { VENUE_PRICE_QUOTE } from './venueBooking';

const QUOTE_DEBOUNCE_MS = 300;

/** The instant booking the form holds, or null (virtual, a held slot, or no window yet). */
export function bookingOfForm(form: CreatePodForm): InstantBooking | null {
  const [mode, slotId, start, end, pax, pets, space] = form.watch([
    'pod_mode',
    'venue_slot_id',
    'pod_date_time',
    'pod_end_date_time',
    'venue_booking_pax',
    'venue_booking_pets',
    'venue_space_label',
  ]);
  if (mode !== 'PHYSICAL' || slotId) return null;
  return instantBookingInput({
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
    pax: Number(pax) || 0,
    pets: Boolean(pets),
    spaceLabel: space,
  });
}

/**
 * The server's price for the window the host picked (`venuePriceQuote`),
 * debounced so stepping guests or times does not fire a request per click.
 * Step 3 shows it; the stepper feeds its `total` into the earnings preview, so
 * both read one cached answer. Native twin: useVenueQuote.
 */
export function useVenueQuote(form: CreatePodForm) {
  const venueId = form.watch('venue_id');
  const booking = bookingOfForm(form);
  const key = venueId && booking ? JSON.stringify(booking) : '';
  const [sent, setSent] = useState(key);
  useEffect(() => {
    const timer = setTimeout(() => setSent(key), QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [key]);
  const sentBooking: InstantBooking | null = sent ? JSON.parse(sent) : null;
  const { data, loading, error } = useQuery(VENUE_PRICE_QUOTE, {
    variables: { venue_id: venueId, booking: sentBooking ?? { start_at: '', end_at: '' } },
    skip: !sentBooking,
    fetchPolicy: 'cache-first',
  });
  const settled = sent === key && Boolean(key);
  return {
    /** Null while nothing is picked, the request is in flight, or it failed. */
    quote: settled && !error ? (data?.venuePriceQuote ?? null) : null,
    loading: Boolean(key) && (!settled || loading),
    error: settled ? (error ?? null) : null,
  };
}
