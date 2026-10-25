import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { VenueSlotRequestsDocument } from '@/graphql/venue-slot-requests';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import { useSelectedVenue } from '@/hooks/useSelectedVenue';
import { useVenueOfferAnswers } from '@/hooks/useVenueOfferAnswers';

type Data = ResultOf<typeof VenueSlotRequestsDocument>;
export type SlotRequestRow = Data['venueSlotRequests'][number];
export type OwnedVenue = Data['myVenues'][number];
export type BookingOffer = NonNullable<SlotRequestRow['offer']>;

/** Both lists come back in one round trip, so the filter has its options. */
export const ALL_VENUES = 'ALL';

/**
 * Booking requests — the RN twin of mWeb's venue-slot-requests-page: list
 * hosts' offers and answer them (accept, reject, counter — `answers`, each for
 * the round on screen). `onDecided` runs after any answer, so a list beside
 * this one (the answered history) re-reads too.
 *
 * A decision is refetched rather than patched into local state: approving a
 * slot changes the pod's status server-side, and a list that guessed at that
 * would show a stale row the next person to look would not.
 */
export function useVenueSlotRequests(onDecided?: () => unknown) {
  const [venues, setVenues] = useState<OwnedVenue[]>([]);
  // The screen opens on the venue picked on any Venue Studio screen; "All
  // venues" stays one tap away, and picking a venue here moves that shared pick.
  const [showAll, setShowAll] = useState(false);
  const { venueId: selectedId, selectVenue } = useSelectedVenue(venues);
  const venueId = showAll || !selectedId ? ALL_VENUES : selectedId;
  const setVenueId = useCallback(
    (id: string) => {
      setShowAll(id === ALL_VENUES);
      if (id !== ALL_VENUES) selectVenue(id);
    },
    [selectVenue],
  );
  const [requests, setRequests] = useState<SlotRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await graphqlRequest(
      VenueSlotRequestsDocument,
      { venue_id: venueId === ALL_VENUES ? null : venueId },
      { auth: true },
    );
    setVenues(res.myVenues ?? []);
    setRequests(res.venueSlotRequests ?? []);
  }, [venueId]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    load()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  useRefreshRegistration(load);

  const reread = useCallback(async () => {
    await load();
    await onDecided?.();
  }, [load, onDecided]);
  const answers = useVenueOfferAnswers(reread);

  return { venueId, setVenueId, venues, requests, isLoading, answers, refetch: load };
}
