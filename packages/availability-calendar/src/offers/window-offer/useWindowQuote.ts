import type { DocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import type { CounterQuoteResult } from '../queries';
import type { WindowOfferInput } from './window-offer.types';

/** Waits this long after the last keystroke before pricing the proposal. */
const DEBOUNCE_MS = 400;

/**
 * Which server query prices a proposal, and how the proposal becomes its
 * variables — each flow (Pod Request, Auto Pod, Change Request) has its own,
 * all answering `{ ok, message, quote }`.
 */
export interface WindowQuoteSource {
  document: DocumentNode;
  /** The query's field, e.g. `podPartnerWindowQuote`. */
  field: string;
  variables: (offer: WindowOfferInput) => Record<string, unknown>;
}

/** The server's price for the window and terms being typed; a null offer (form not ready) asks nothing. */
export function useWindowQuote(source: WindowQuoteSource, offer: WindowOfferInput | null) {
  const typed = offer ? JSON.stringify(source.variables(offer)) : '';
  const settled = useDebouncedValue(typed, DEBOUNCE_MS);
  const query = useQuery<Record<string, CounterQuoteResult | undefined>>(source.document, {
    variables: settled ? JSON.parse(settled) : undefined,
    skip: !settled,
    fetchPolicy: 'network-only',
  });
  const answer = settled ? ((query.data ?? query.previousData)?.[source.field] ?? null) : null;
  return { answer, loading: typed !== settled || query.loading, error: settled ? query.error : undefined };
}
