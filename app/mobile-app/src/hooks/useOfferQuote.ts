import { useEffect, useState } from 'react';
import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import { VenueOfferQuoteDocument } from '@/graphql/venue-offer';
import { graphqlRequest } from '@/services/graphql.client';

type OfferQuoteResult = ResultOf<typeof VenueOfferQuoteDocument>['venueOfferQuote'];
export type HostVenueQuote = NonNullable<OfferQuoteResult['quote']>;
type OfferInput = VariablesOf<typeof VenueOfferQuoteDocument>['offer'];

const QUOTE_DEBOUNCE_MS = 300;

/**
 * The server's price for the host's offer (`venueOfferQuote`): the offered
 * rate with the venue's price rules, fees, minimum spend and GST, and Duncit's
 * commission on top — or, when it cannot be sent, why (`message`). Debounced
 * so typing an amount or stepping guests does not fire a request per tap. The
 * stepper owns it: step 3 shows the breakdown and step 4 feeds it into the
 * earnings preview, from the one answer. mWeb twin: useOfferQuote.
 */
export function useOfferQuote(venueId: string, offer: OfferInput | null) {
  const key = venueId && offer ? JSON.stringify(offer) : '';
  const [quote, setQuote] = useState<HostVenueQuote | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuote(null);
    setMessage(null);
    setError(null);
    if (!key) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    const sent: OfferInput = JSON.parse(key);
    const timer = setTimeout(() => {
      graphqlRequest(VenueOfferQuoteDocument, { venue_id: venueId, offer: sent }, { auth: true })
        .then((res) => {
          if (!active) return;
          const answer = res.venueOfferQuote;
          setQuote(answer.ok ? (answer.quote ?? null) : null);
          setMessage(answer.ok ? null : (answer.message ?? null));
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(err);
          logs.mobileApp.warn('useOfferQuote', 'quote', { error: err, venue_id: venueId });
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [venueId, key]);

  return { quote, message, loading, error };
}
