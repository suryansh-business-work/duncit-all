import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import type { VenueOfferModel } from '@/generated/graphql/graphql';
import { VenueCounterQuoteDocument } from '@/graphql/venue-slot-requests';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { CounterTerms } from '@/hooks/useVenueSlotRequests';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

export type CounterQuoteResult = ResultOf<typeof VenueCounterQuoteDocument>['venueCounterQuote'];

/** Long enough that typing an amount does not fire a quote per keystroke. */
const QUOTE_DEBOUNCE_MS = 600;

interface QuoteState {
  result: CounterQuoteResult | null;
  error: string | null;
  isLoading: boolean;
}

const IDLE: QuoteState = { result: null, error: null, isLoading: false };

/**
 * The server's price for a counter the venue is typing, for the booking's own
 * window — the only place a price is computed. Debounced, and a late answer
 * for older terms is dropped. `terms` null = nothing to price yet.
 */
export function useVenueCounterQuote(
  slotId: string,
  terms: CounterTerms | null,
  failedText: string,
): QuoteState {
  const settled = useDebouncedValue(JSON.stringify(terms), QUOTE_DEBOUNCE_MS);
  const [state, setState] = useState<QuoteState>(IDLE);

  useEffect(() => {
    const input = JSON.parse(settled) as CounterTerms | null;
    if (!input) {
      setState(IDLE);
      return;
    }
    let active = true;
    setState((prev) => ({ ...prev, isLoading: true }));
    graphqlRequest(
      VenueCounterQuoteDocument,
      { slot_id: slotId, terms: { model: input.model as VenueOfferModel, rate: input.rate } },
      { auth: true },
    )
      .then(
        (data) =>
          active && setState({ result: data.venueCounterQuote, error: null, isLoading: false }),
      )
      .catch(
        (e: unknown) =>
          active &&
          setState({ result: null, error: toErrorMessage(e, failedText), isLoading: false }),
      );
    return () => {
      active = false;
    };
  }, [settled, slotId, failedText]);

  return state;
}
