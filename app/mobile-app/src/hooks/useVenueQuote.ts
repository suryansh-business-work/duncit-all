import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';
import type { InstantBooking } from '@duncit/utils';

import { HostVenuePriceQuoteDocument } from '@/graphql/venue-booking';
import { graphqlRequest } from '@/services/graphql.client';

export type HostVenueQuote = ResultOf<typeof HostVenuePriceQuoteDocument>['venuePriceQuote'];

const QUOTE_DEBOUNCE_MS = 300;

/**
 * The server's price for the window the host picked (`venuePriceQuote`),
 * debounced so stepping guests or times does not fire a request per tap. The
 * stepper owns it: step 3 shows the breakdown and step 4 feeds its `total`
 * into the earnings preview, from the one answer. mWeb twin: useVenueQuote.
 */
export function useVenueQuote(venueId: string, booking: InstantBooking | null) {
  const key = venueId && booking ? JSON.stringify(booking) : '';
  const [quote, setQuote] = useState<HostVenueQuote | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuote(null);
    setError(null);
    if (!key) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    const sent: InstantBooking = JSON.parse(key);
    const timer = setTimeout(() => {
      graphqlRequest(
        HostVenuePriceQuoteDocument,
        { venue_id: venueId, booking: sent },
        { auth: true },
      )
        .then((res) => {
          if (active) setQuote(res.venuePriceQuote);
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(err);
          logs.mobileApp.warn('useVenueQuote', 'quote', { error: err, venue_id: venueId });
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

  return { quote, loading, error };
}
