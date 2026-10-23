import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import { VENUE_COUNTER_QUOTE, type CounterQuoteResult } from './queries';

/** How long the preview waits after the last keystroke before it asks the server. */
const QUOTE_DEBOUNCE_MS = 400;

export interface CounterTerms {
  model: string;
  rate: number;
}

/**
 * The server's price for a counter the venue is typing, for the booking's own
 * window — debounced, so an amount asks once rather than per keystroke. Only
 * the server prices; null terms (the form is not valid yet) ask nothing.
 */
export function useCounterQuote(slotId: string, terms: CounterTerms | null) {
  const key = JSON.stringify(terms);
  const settledKey = useDebouncedValue(key, QUOTE_DEBOUNCE_MS);
  const settled = JSON.parse(settledKey) as CounterTerms | null;
  const { data, previousData, loading, error } = useQuery<{ venueCounterQuote: CounterQuoteResult }>(VENUE_COUNTER_QUOTE, {
    variables: { slot_id: slotId, terms: settled },
    skip: !settled,
    fetchPolicy: 'network-only',
  });
  return {
    result: settled ? ((data ?? previousData)?.venueCounterQuote ?? null) : null,
    loading: loading || key !== settledKey,
    error: settled ? error : undefined,
  };
}
