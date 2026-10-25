import type { DocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import type { CounterQuoteResult } from './queries';

/** Waits this long after the last keystroke before asking the server for a price. */
const DEBOUNCE_MS = 400;

/**
 * Which server query prices what is being typed, and how it becomes that
 * query's variables. Every flow answers `{ ok, message, quote, quote_min? }`.
 */
export interface LiveQuoteSource<I> {
  document: DocumentNode;
  /** The query's field, e.g. `venueCounterQuote`. */
  field: string;
  variables: (input: I) => Record<string, unknown>;
}

/**
 * The server's price for terms as they are typed — debounced, so a typed amount
 * asks once rather than per keystroke. A null input (the form is not ready)
 * asks nothing; only the variables decide whether a new price is asked for, so
 * fields the source leaves out never re-price.
 */
export function useLiveQuote<I>(source: LiveQuoteSource<I>, input: I | null) {
  const typed = input ? JSON.stringify(source.variables(input)) : '';
  const settled = useDebouncedValue(typed, DEBOUNCE_MS);
  const query = useQuery<Record<string, CounterQuoteResult | undefined>>(source.document, {
    variables: settled ? JSON.parse(settled) : undefined,
    skip: !settled,
    fetchPolicy: 'network-only',
  });
  const answer = settled ? ((query.data ?? query.previousData)?.[source.field] ?? null) : null;
  return { answer, loading: typed !== settled || query.loading, error: settled ? query.error : undefined };
}
