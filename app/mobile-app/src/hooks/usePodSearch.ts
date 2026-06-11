import { useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodSearchDocument } from '@/graphql/search';
import { graphqlRequest } from '@/services/graphql.client';

export type SearchPod = ResultOf<typeof PodSearchDocument>['pods'][number];

const DEBOUNCE_MS = 350;

/**
 * Server-side pod search with debounce: waits for the user to pause typing,
 * then asks the server (`pods(filter: { search })`) — mirroring mWeb's
 * debounced header search. Stale responses are dropped by request sequencing.
 */
export function usePodSearch(query: string) {
  const [results, setResults] = useState<SearchPod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const seq = useRef(0);

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  useEffect(() => {
    const requestId = ++seq.current;
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    const timer = setTimeout(() => {
      graphqlRequest(
        PodSearchDocument,
        { filter: { search: trimmed, is_active: true } },
        { auth: true },
      )
        .then((data) => {
          if (seq.current === requestId) {
            setResults(data.pods);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (seq.current === requestId) {
            setResults([]);
            setIsLoading(false);
          }
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  return { results, isLoading, hasQuery };
}
