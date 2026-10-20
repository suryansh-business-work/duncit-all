import { useEffect, useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import type { InstantBookingInput, VenuePricingInput } from '@/generated/graphql/graphql';
import { VenuePriceQuoteDocument } from '@/graphql/venue-pricing';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

export type VenueQuote = ResultOf<typeof VenuePriceQuoteDocument>['venuePriceQuote'];

/** Long enough that typing a price does not fire a quote per keystroke. */
const QUOTE_DEBOUNCE_MS = 600;

interface QuoteState {
  quote: VenueQuote | null;
  error: string | null;
  isLoading: boolean;
}

const IDLE: QuoteState = { quote: null, error: null, isLoading: false };

/**
 * The server's price for one window at a venue — the only place a price is
 * computed. `draft` is the owner's unsaved pricing (the Venue Pricing Module's
 * live preview); without it the venue's saved pricing is quoted (a counter
 * offer). Debounced, and a late answer for an older input is dropped.
 * `booking` null = nothing to price yet.
 */
export function useVenuePriceQuote(
  venueId: string | null,
  booking: InstantBookingInput | null,
  draft: VenuePricingInput | null,
  failedText: string,
): QuoteState {
  const key = useMemo(() => JSON.stringify({ venueId, booking, draft }), [venueId, booking, draft]);
  const settled = useDebouncedValue(key, QUOTE_DEBOUNCE_MS);
  const [state, setState] = useState<QuoteState>(IDLE);

  useEffect(() => {
    const input: {
      venueId: string | null;
      booking: InstantBookingInput | null;
      draft: VenuePricingInput | null;
    } = JSON.parse(settled);
    if (!input.venueId || !input.booking) {
      setState(IDLE);
      return;
    }
    let active = true;
    setState((prev) => ({ ...prev, isLoading: true }));
    graphqlRequest(
      VenuePriceQuoteDocument,
      { venue_id: input.venueId, booking: input.booking, draft: input.draft },
      { auth: true },
    )
      .then(
        (data) =>
          active && setState({ quote: data.venuePriceQuote, error: null, isLoading: false }),
      )
      .catch(
        (e: unknown) =>
          active &&
          setState({ quote: null, error: toErrorMessage(e, failedText), isLoading: false }),
      );
    return () => {
      active = false;
    };
  }, [settled, failedText]);

  return state;
}

/** A day key and an 'HH:mm' clock as an ISO instant, in the device's zone. */
export function instantOf(dayKey: string, clock: string): string {
  return new Date(`${dayKey}T${clock}:00`).toISOString();
}
