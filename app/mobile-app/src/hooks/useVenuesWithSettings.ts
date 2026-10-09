import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MyVenuesWithSettingsDocument } from '@/graphql/venue-availability';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import { useSelectedVenue } from '@/hooks/useSelectedVenue';

export type SettingsVenue = ResultOf<typeof MyVenuesWithSettingsDocument>['myVenues'][number];

/**
 * The owner's venues with their settings, and which one the screen is about.
 *
 * Shared by the availability calendar and the venue settings screen: both edit
 * one venue picked from the same switcher — the persisted pick every Venue
 * Studio screen shares (`useSelectedVenue`). `refetch`
 * re-reads the list after a write so a saved rule or policy is what the screen
 * shows next, never a guess patched into local state.
 *
 * A failed load is surfaced as `error`, never swallowed: an owner whose venues
 * did not arrive must read the failure, not "register a venue first" — the
 * same three states mWeb's VenuePageFrame renders (rule 27).
 */
export function useVenuesWithSettings() {
  const [venues, setVenues] = useState<SettingsVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useRefreshRegistration(refetch);

  useEffect(() => {
    let active = true;
    // Every `refetch` runs this again — after the recurring sheet writes venue
    // rules, say — so the flag has to go back up, not just start there. mWeb's
    // VenuePageFrame dims the venue for the same wait (rule 27).
    setIsLoading(true);
    graphqlRequest(MyVenuesWithSettingsDocument, undefined, { auth: true })
      .then((data) => {
        if (!active) return;
        setVenues(data.myVenues);
        setError(null);
      })
      .catch((e: unknown) => active && setError(toErrorMessage(e)))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [attempt]);

  // The pick every Venue Studio screen shares, remembered across launches.
  const { venue, venueId, selectVenue } = useSelectedVenue(venues);

  return {
    venues,
    venue,
    venueId,
    selectVenue,
    isLoading,
    error,
    refetch,
  };
}
