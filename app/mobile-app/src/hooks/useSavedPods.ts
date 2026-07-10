import { useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MySavedPodsDocument } from '@/graphql/saved';
import { graphqlRequest } from '@/services/graphql.client';
import type { SavedSort } from '@/utils/saved-filter';

export type SavedPod = ResultOf<typeof MySavedPodsDocument>['mySavedPods'][number];

const DEBOUNCE_MS = 350;

interface SavedPodsArgs {
  search: string;
  categoryId: string | null;
  sort: SavedSort;
}

/**
 * The viewer's saved pods, driven entirely by the server: a debounced (350ms)
 * search plus the category filter and sort. Mirrors useSearch — request
 * sequencing drops stale responses when the args change mid-flight.
 */
export function useSavedPods({ search, categoryId, sort }: SavedPodsArgs) {
  const [pods, setPods] = useState<SavedPod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const seq = useRef(0);
  const trimmed = search.trim();

  useEffect(() => {
    const requestId = ++seq.current;
    setIsLoading(true);
    const timer = setTimeout(() => {
      graphqlRequest(
        MySavedPodsDocument,
        { search: trimmed || null, categoryId, sort },
        { auth: true },
      )
        .then((data) => {
          if (seq.current !== requestId) return;
          setPods(data.mySavedPods);
          setError(undefined);
          setIsLoading(false);
        })
        .catch((err) => {
          if (seq.current !== requestId) return;
          setError(err);
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, categoryId, sort]);

  return { pods, isLoading, error };
}
