import { HOST_COUNTER_OFFER_QUOTE } from './host/queries';
import { EDIT_COUNTER_QUOTE, VENUE_COUNTER_QUOTE } from './queries';
import { useLiveQuote, type LiveQuoteSource } from './useLiveQuote';

/**
 * What a counter is priced on: the pricing option, the amount and — for a
 * per-guest price — the fewest guests. Never the points or the note, so typing
 * them never asks for a new price.
 */
export interface CounterTerms {
  model: string;
  rate: number;
  min_guests?: number;
}

/** Who prices a counter: the venue's for its booking (`venueCounterQuote`), the host's for their pod (`hostCounterQuote`). */
export type CounterQuoteSource = LiveQuoteSource<CounterTerms>;

export const venueCounterQuoteSource = (slotId: string): CounterQuoteSource => ({
  document: VENUE_COUNTER_QUOTE,
  field: 'venueCounterQuote',
  variables: (terms) => ({ slot_id: slotId, terms }),
});

/** Either side's edit of its own counter, priced for the pod's booking (`editCounterQuote`). */
export const editCounterQuoteSource = (podId: string): CounterQuoteSource => ({
  document: EDIT_COUNTER_QUOTE,
  field: 'editCounterQuote',
  variables: (terms) => ({ pod_id: podId, terms }),
});

export const hostCounterQuoteSource = (podId: string): CounterQuoteSource => ({
  document: HOST_COUNTER_OFFER_QUOTE,
  field: 'hostCounterQuote',
  variables: (terms) => ({ pod_id: podId, terms }),
});

/**
 * The server's price for a counter as it is typed, for the booking's own
 * window, at the most and the fewest guests. Only the server prices; null terms
 * (the form is not valid yet) ask nothing.
 */
export function useCounterQuote(source: CounterQuoteSource, terms: CounterTerms | null) {
  const { answer, loading, error } = useLiveQuote(source, terms);
  return { result: answer, loading, error };
}
