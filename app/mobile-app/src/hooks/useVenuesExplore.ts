import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileVenuesDocument } from '@/graphql/hosts-venues';
import { useLocationStore } from '@/stores/location.store';
import { graphqlRequest } from '@/services/graphql.client';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { useRefreshRegistration } from '@/components/PullToRefresh';

export type ExploreVenue = ResultOf<typeof MobileVenuesDocument>['publicVenues'][number];

const SEARCH_DEBOUNCE_MS = 400;

/** Venues discovery data: venues in the user's selected location, refetched
 * server-side on a debounced search and on the header's Super-category tiles —
 * the same app-wide filter Home, Explore, Clubs and Chats read, so the tiles
 * above the list are never a control that does nothing. */
export function useVenuesExplore() {
  const locationId = useLocationStore((s) => s.selectedId);
  const cityLabel = useLocationStore((s) => s.cityLabel);
  const { selectedSuperId } = useSuperCategories();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [venues, setVenues] = useState<ExploreVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  // Debounce typing → one server search per pause (the server matches
  // name/type/city/locality).
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(
      MobileVenuesDocument,
      {
        location_id: locationId || null,
        search: search || null,
        super_category_id: selectedSuperId,
        category_id: null,
        sub_category_id: null,
      },
      { auth: true },
    )
      .then((d) => {
        if (!active) return;
        setVenues(d.publicVenues);
        setError(undefined);
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [locationId, search, selectedSuperId, attempt]);

  useRefreshRegistration(refetch);

  return {
    venues,
    cityLabel,
    searchInput,
    setSearchInput,
    isLoading,
    error,
  };
}
