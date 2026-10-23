import { useQuery } from '@apollo/client/react';
import { useDebouncedValue } from '@duncit/ui';
import type { CounterQuoteResult } from '../../offers/queries';
import { VENUE_OFFER_QUOTE } from '../queries';
import type { offerInput } from './respond-event-request.types';

type CounterOffer = NonNullable<ReturnType<typeof offerInput>>;

/** Waits this long after the last keystroke before pricing the counter. */
const DEBOUNCE_MS = 400;

/**
 * The server's price (`venueOfferQuote`) for the window and terms the owner is
 * countering with — the same price it freezes on the offer when it is sent.
 * A null offer (venue or form not ready) asks nothing.
 */
export function useRespondQuote(venueId: string | null, offer: CounterOffer | null) {
  const typed = venueId && offer ? JSON.stringify({ venue_id: venueId, offer }) : '';
  const settled = useDebouncedValue(typed, DEBOUNCE_MS);
  const query = useQuery<{ venueOfferQuote: CounterQuoteResult }>(VENUE_OFFER_QUOTE, {
    variables: settled ? JSON.parse(settled) : undefined,
    skip: !settled,
    fetchPolicy: 'network-only',
  });
  const answer = settled ? ((query.data ?? query.previousData)?.venueOfferQuote ?? null) : null;
  return { answer, loading: typed !== settled || query.loading, error: settled ? query.error : undefined };
}
