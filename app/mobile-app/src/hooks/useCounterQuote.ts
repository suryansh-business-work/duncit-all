import { useEffect, useRef, useState } from 'react';

import type { CounterQuoteResult } from '@/components/venue-offer/offer-format';
import type { VenueOfferTermsInput } from '@/generated/graphql/graphql';
import { HostCounterQuoteDocument } from '@/graphql/venue-offer';
import { VenueCounterQuoteDocument } from '@/graphql/venue-slot-requests';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/** Who prices a counter: the venue for its booking (`venueCounterQuote`), the host for their pod (`hostCounterQuote`). */
export type CounterQuoteTarget =
  { side: 'VENUE'; slotId: string } | { side: 'HOST'; podId: string };

/** Long enough that typing an amount does not fire a quote per keystroke. */
const QUOTE_DEBOUNCE_MS = 600;

interface QuoteState {
  result: CounterQuoteResult | null;
  error: string | null;
  isLoading: boolean;
}

const IDLE: QuoteState = { result: null, error: null, isLoading: false };

async function askQuote(
  target: CounterQuoteTarget,
  terms: VenueOfferTermsInput,
): Promise<CounterQuoteResult> {
  if (target.side === 'VENUE') {
    const data = await graphqlRequest(
      VenueCounterQuoteDocument,
      { slot_id: target.slotId, terms },
      { auth: true },
    );
    return data.venueCounterQuote;
  }
  const data = await graphqlRequest(
    HostCounterQuoteDocument,
    { pod_id: target.podId, terms },
    { auth: true },
  );
  return data.hostCounterQuote;
}

/**
 * The server's price for a counter as it is typed, for the booking's own
 * window, at the most and the fewest guests — the only place a price is
 * computed. Debounced, and a late answer for older terms is dropped. `terms`
 * null = nothing to price yet (the form is not valid). mWeb twin: useCounterQuote.
 */
export function useCounterQuote(
  target: CounterQuoteTarget,
  terms: VenueOfferTermsInput | null,
  failedText: string,
): QuoteState {
  const settled = useDebouncedValue(JSON.stringify(terms), QUOTE_DEBOUNCE_MS);
  const [state, setState] = useState<QuoteState>(IDLE);
  // The latest target, read when the terms settle: `targetKey` already says when it changed.
  const targetRef = useRef(target);
  targetRef.current = target;
  const targetKey = target.side === 'VENUE' ? `VENUE:${target.slotId}` : `HOST:${target.podId}`;

  useEffect(() => {
    const input: VenueOfferTermsInput | null = JSON.parse(settled);
    if (!input) {
      setState(IDLE);
      return undefined;
    }
    let active = true;
    setState((prev) => ({ ...prev, isLoading: true }));
    askQuote(targetRef.current, input)
      .then((result) => {
        if (active) setState({ result, error: null, isLoading: false });
      })
      .catch((e: unknown) => {
        if (active)
          setState({ result: null, error: toErrorMessage(e, failedText), isLoading: false });
      });
    return () => {
      active = false;
    };
  }, [settled, targetKey, failedText]);

  return state;
}
