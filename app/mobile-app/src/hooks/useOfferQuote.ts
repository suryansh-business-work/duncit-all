import type { VariablesOf } from '@graphql-typed-document-node/core';

import { VenueOfferQuoteDocument } from '@/graphql/venue-offer';
import { useQuoteRequest } from '@/hooks/useQuoteRequest';
import { graphqlRequest } from '@/services/graphql.client';

export type { HostVenueQuote } from '@/hooks/useQuoteRequest';
type OfferInput = VariablesOf<typeof VenueOfferQuoteDocument>['offer'];

/**
 * The server's price for the host's offer (`venueOfferQuote`): the offered
 * rate with the venue's price rules, fees, minimum spend and GST, and Duncit's
 * commission on top, at the pod's spots (`quote`) and at the venue's minimum
 * guests (`quoteMin`) — or, when it cannot be sent, why (`message`). Debounced
 * so typing an amount or stepping guests does not fire a request per tap; the
 * caller asks with `venueOfferPriceInput`, so the points and the note never
 * re-price. The stepper owns it: step 3 shows the breakdown and step 4 feeds it
 * into the earnings preview, from the one answer. mWeb twin: useOfferQuote.
 */
export function useOfferQuote(venueId: string, offer: OfferInput | null) {
  const key = venueId && offer ? JSON.stringify([venueId, offer]) : null;
  return useQuoteRequest(
    key,
    async () => {
      // Only asked while `key` is set, i.e. while there is an offer.
      if (!offer) throw new Error('VENUE_OFFER_QUOTE_WITHOUT_OFFER');
      const res = await graphqlRequest(
        VenueOfferQuoteDocument,
        { venue_id: venueId, offer },
        { auth: true },
      );
      return res.venueOfferQuote;
    },
    'useOfferQuote',
  );
}
