import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { SuggestedTicketPricesDocument } from '@/graphql/create-pod';
import { graphqlRequest } from '@/services/graphql.client';

export type SuggestedTicketPrice = ResultOf<
  typeof SuggestedTicketPricesDocument
>['suggestedTicketPrices'][number];

/**
 * The ₹x99 ticket-price ladder for Step 4's "Suggested Ticket Prices" modal.
 * Fetched lazily — `enabled` is the modal's open state, so a host who never
 * opens it never pays for the query. Venue args come from the picked slot.
 */
export function useSuggestedTicketPrices(
  enabled: boolean,
  noOfSpots: number,
  venueId: string | null,
  venueAmount: number | null,
) {
  const [prices, setPrices] = useState<SuggestedTicketPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || noOfSpots <= 1) return undefined;
    let active = true;
    setIsLoading(true);
    setError(false);
    graphqlRequest(
      SuggestedTicketPricesDocument,
      { no_of_spots: noOfSpots, venue_id: venueId, venue_amount: venueAmount },
      { auth: true },
    )
      .then((res) => {
        if (active) setPrices(res.suggestedTicketPrices);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, noOfSpots, venueId, venueAmount]);

  return { prices, isLoading, error };
}
