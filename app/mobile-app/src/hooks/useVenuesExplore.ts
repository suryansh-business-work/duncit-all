import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileVenuesDocument } from '@/graphql/hosts-venues';
import { CategoriesDocument, type CategoriesResult } from '@/graphql/onboarding-survey';
import { useLocationStore } from '@/stores/location.store';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';

export type ExploreVenue = ResultOf<typeof MobileVenuesDocument>['publicVenues'][number];
export type VenueCategoryOption = CategoriesResult['categories'][number];

const SEARCH_DEBOUNCE_MS = 400;

/** Venues discovery data: venues in the user's selected location, refetched
 * server-side on a debounced search + a Super-category chip filter. */
export function useVenuesExplore() {
  const locationId = useLocationStore((s) => s.selectedId);
  const cityLabel = useLocationStore((s) => s.cityLabel);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [superCategoryId, setSuperCategoryId] = useState('');
  const [categories, setCategories] = useState<VenueCategoryOption[]>([]);
  const [venues, setVenues] = useState<ExploreVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  // Debounce typing → one server search per pause (the server matches
  // name/type/city/locality).
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Super-category chips (shared taxonomy) — loaded once.
  useEffect(() => {
    let active = true;
    fireAndForget(
      graphqlRequest<CategoriesResult, { level: string; parent_id: string | null }>(
        CategoriesDocument,
        { level: 'SUPER', parent_id: null },
        { auth: true },
      )
        .then((r) => {
          if (active) setCategories((r.categories ?? []).filter((c) => c.is_active !== false));
        })
        .catch(() => undefined),
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(
      MobileVenuesDocument,
      {
        location_id: locationId || null,
        search: search || null,
        super_category_id: superCategoryId || null,
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
  }, [locationId, search, superCategoryId]);

  return {
    venues,
    categories,
    cityLabel,
    searchInput,
    setSearchInput,
    superCategoryId,
    setSuperCategoryId,
    isLoading,
    error,
  };
}
