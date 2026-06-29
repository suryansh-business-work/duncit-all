import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  SearchCategoriesDocument,
  SearchDiscoveryDocument,
  SearchSuggestionsDocument,
} from '@/graphql/search';
import { graphqlRequest } from '@/services/graphql.client';

export type SearchClubResult = ResultOf<
  typeof SearchDiscoveryDocument
>['searchDiscovery']['happening'][number];
export type SearchSuggestion = ResultOf<
  typeof SearchSuggestionsDocument
>['searchSuggestions'][number];
export type SearchCategory = ResultOf<typeof SearchCategoriesDocument>['categories'][number];

const DEBOUNCE_MS = 350;
const MIN_SUGGEST_LEN = 2;

interface DiscoveryState {
  happening: SearchClubResult[];
  moreClubs: SearchClubResult[];
}

const EMPTY: DiscoveryState = { happening: [], moreClubs: [] };

/**
 * Debounced club-centric discovery search. Skipped (and `active=false`) when
 * there is nothing to search, so the screen can show category quick-actions.
 * Stale responses are dropped by request sequencing (mirrors usePodSearch).
 */
export function useSearchDiscovery(query: string, categoryId: string) {
  const [state, setState] = useState<DiscoveryState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const seq = useRef(0);

  const trimmed = query.trim();
  const active = trimmed.length > 0 || categoryId.length > 0;

  useEffect(() => {
    const requestId = ++seq.current;
    if (!active) {
      setState(EMPTY);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      graphqlRequest(
        SearchDiscoveryDocument,
        { input: { query: trimmed || undefined, category_id: categoryId || undefined } },
        { auth: true },
      )
        .then((data) => {
          if (seq.current !== requestId) return;
          setState({
            happening: data.searchDiscovery.happening,
            moreClubs: data.searchDiscovery.more_clubs,
          });
          setLoading(false);
        })
        .catch(() => {
          if (seq.current !== requestId) return;
          setState(EMPTY);
          setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, categoryId, active, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { happening: state.happening, moreClubs: state.moreClubs, loading, active, refetch };
}

/** Debounced type-ahead suggestions; empty until at least two characters. */
export function useSearchSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const seq = useRef(0);
  const trimmed = query.trim();

  useEffect(() => {
    const requestId = ++seq.current;
    if (trimmed.length < MIN_SUGGEST_LEN) {
      setSuggestions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      graphqlRequest(SearchSuggestionsDocument, { query: trimmed }, { auth: true })
        .then((data) => {
          if (seq.current === requestId) setSuggestions(data.searchSuggestions);
        })
        .catch(() => {
          if (seq.current === requestId) setSuggestions([]);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  return suggestions;
}

interface ClubCategoryRef {
  category_id?: string | null;
  super_category_id?: string | null;
}

/** Categories for the quick-action buttons + club-card labels (fetched once). */
export function useSearchCategories() {
  const [all, setAll] = useState<SearchCategory[]>([]);

  useEffect(() => {
    let alive = true;
    graphqlRequest(SearchCategoriesDocument, {}, { auth: true })
      .then((data) => {
        if (alive) setAll(data.categories);
      })
      .catch(() => {
        if (alive) setAll([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const categoryLevel = all.filter((category) => category.level === 'CATEGORY');
    return categoryLevel.length > 0
      ? categoryLevel
      : all.filter((category) => category.level === 'SUPER');
  }, [all]);

  const nameById = useMemo(
    () => new Map(all.map((category) => [category.id, category.name])),
    [all],
  );

  const nameOf = useCallback(
    (club: ClubCategoryRef) => {
      const byLeaf = club.category_id ? nameById.get(club.category_id) : undefined;
      const bySuper = club.super_category_id ? nameById.get(club.super_category_id) : undefined;
      return byLeaf ?? bySuper ?? null;
    },
    [nameById],
  );

  return { categories, nameOf };
}
