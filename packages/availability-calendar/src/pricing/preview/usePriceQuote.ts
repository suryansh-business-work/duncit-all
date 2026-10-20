import { useMemo, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { addDays } from 'date-fns';
import { parseIsoDay, toIsoDay } from '@duncit/datetime';
import { useDebouncedValue } from '@duncit/ui';
import { VENUE_PRICE_QUOTE } from '../queries';
import type { PriceBreakdown, SampleBooking, VenuePricingInput } from '../types';

/** How long the preview waits after the last keystroke before it asks the server. */
const QUOTE_DEBOUNCE_MS = 500;

/** A wall-clock day and time ('yyyy-MM-dd', 'HH:mm') as an instant, read on this device's clock. */
export function wallInstant(day: string, time: string): string | null {
  const date = parseIsoDay(day);
  const [h, m] = time.split(':').map(Number);
  if (!date || !Number.isFinite(h) || !Number.isFinite(m)) return null;
  date.setHours(h, m, 0, 0);
  return date.toISOString();
}

/** The booking the server prices for a sample, or null while it is incomplete. */
export function bookingOf(sample: SampleBooking) {
  const start = wallInstant(sample.date, sample.start);
  const end = wallInstant(sample.date, sample.end);
  if (!start || !end || end <= start) return null;
  return { start_at: start, end_at: end, pax: Math.max(0, Math.floor(sample.pax || 0)), pets: sample.pets };
}

/** Tomorrow evening for 10 guests — something every model can price. */
export function defaultSample(): SampleBooking {
  return { date: toIsoDay(addDays(new Date(), 1)), start: '18:00', end: '20:00', pax: 10, pets: false };
}

interface Options {
  venueId: string;
  sample: SampleBooking;
  /** The unsaved pricing to preview; null = quote the saved pricing. */
  draft: VenuePricingInput | null;
  /** False while the form is invalid — nothing is asked until it is fixed. */
  enabled: boolean;
}

/**
 * The server's quote for a sample booking, debounced so typing a rate asks
 * once rather than per keystroke. Only the server prices (contract rule).
 */
export function usePriceQuote({ venueId, sample, draft, enabled }: Readonly<Options>) {
  const booking = useMemo(() => bookingOf(sample), [sample]);
  // One serialised key, so a re-render with equal values is not a new request.
  const key = JSON.stringify({ booking, draft, enabled });
  const debouncedKey = useDebouncedValue(key, QUOTE_DEBOUNCE_MS);
  // The values the debounced key stands for: kept from the render where the
  // key settled, so the request carries what the owner stopped typing at.
  const settled = useRef<{ booking: ReturnType<typeof bookingOf>; draft: VenuePricingInput | null; enabled: boolean } | null>(
    null,
  );
  if (debouncedKey === key) settled.current = { booking, draft, enabled };
  const current = settled.current;
  const variables = { venue_id: venueId, booking: current?.booking ?? null, draft: current?.draft ?? null };
  const skip = !current?.enabled || !variables.booking;
  const { data, previousData, loading, error } = useQuery<{ venuePriceQuote: PriceBreakdown }>(VENUE_PRICE_QUOTE, {
    variables,
    skip,
    fetchPolicy: 'network-only',
  });
  return {
    breakdown: (data ?? previousData)?.venuePriceQuote ?? null,
    loading: loading || key !== debouncedKey,
    error: skip ? undefined : error,
    incomplete: !booking,
  };
}
