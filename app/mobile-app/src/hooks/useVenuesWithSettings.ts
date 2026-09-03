import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { pickVenue } from '@duncit/utils';

import { MyVenuesWithSettingsDocument } from '@/graphql/venue-availability';
import { graphqlRequest } from '@/services/graphql.client';

export type SettingsVenue = ResultOf<typeof MyVenuesWithSettingsDocument>['myVenues'][number];

/**
 * The owner's venues with their settings, and which one the screen is about.
 *
 * Shared by the availability calendar and the venue settings screen: both edit
 * one venue picked from the same switcher, and `pickVenue` (shared with mWeb)
 * decides where that lands before the owner has touched anything. `refetch`
 * re-reads the list after a write so a saved rule or policy is what the screen
 * shows next, never a guess patched into local state.
 */
export function useVenuesWithSettings() {
  const [venues, setVenues] = useState<SettingsVenue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    graphqlRequest(MyVenuesWithSettingsDocument, undefined, { auth: true })
      .then((data) => active && setVenues(data.myVenues))
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [attempt]);

  const venue = pickVenue(venues, selectedId);

  return {
    venues,
    venue,
    venueId: venue?.id ?? null,
    selectVenue: setSelectedId,
    isLoading,
    refetch,
  };
}
