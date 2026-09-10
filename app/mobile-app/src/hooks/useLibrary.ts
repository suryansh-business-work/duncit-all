import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { FaqsDocument, FaqsSearchDocument } from '@/graphql/library';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';

export type FaqGroup = ResultOf<typeof FaqsDocument>['publicFaqGroups'][number];
export type FaqItem = FaqGroup['faqs'][number];

/** FAQ groups for the FAQs page (auth). */
export function useFaqs() {
  const [groups, setGroups] = useState<FaqGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    graphqlRequest(FaqsDocument, undefined, { auth: true })
      .then((data) => active && setGroups(data.publicFaqGroups))
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [attempt]);

  useRefreshRegistration(refetch);

  return { groups, isLoading, error };
}

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Debounced server-side FAQ search (mirrors mWeb's SEARCH_FAQS). Waits for the
 * user to pause typing, then asks the server for active APP FAQs matching the
 * query; stale responses are dropped by request sequencing, and an empty query
 * skips the server entirely.
 */
export function useFaqSearch(search: string) {
  const [results, setResults] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const seq = useRef(0);

  const trimmed = search.trim();
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
      graphqlRequest(FaqsSearchDocument, { search: trimmed }, { auth: true })
        .then((data) => {
          if (seq.current === requestId) {
            setResults(data.faqs);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (seq.current === requestId) {
            setResults([]);
            setIsLoading(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  return { results, isLoading, hasQuery };
}
