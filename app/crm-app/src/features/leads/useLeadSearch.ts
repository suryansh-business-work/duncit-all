import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { fireAndForget, logs } from '@duncit/logs';

import { CrmAppLeadSearchDocument } from '@/graphql/leads';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import type { LeadKind } from './leadKinds';

export type LeadRow = ResultOf<typeof CrmAppLeadSearchDocument>['searchCrmLeads']['rows'][number];

export const PAGE_SIZE = 25;
/** Wait for typing to pause before asking the server. */
export const SEARCH_DEBOUNCE_MS = 350;

/**
 * Lead search across every kind (the portal's searchCrmLeads), page by page.
 * A newer search always wins: an answer to an older one is dropped.
 */
export function useLeadSearch(search: string, kind: LeadKind | null, fallbackError: string) {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const load = useCallback(
    async (nextPage: number) => {
      const id = ++request.current;
      setLoading(true);
      setError(null);
      try {
        const { searchCrmLeads } = await gqlRequest(CrmAppLeadSearchDocument, {
          input: {
            search: search.trim() || null,
            entity_types: kind ? [kind] : null,
            page: nextPage,
            page_size: PAGE_SIZE,
          },
        });
        if (id !== request.current) return;
        setRows((current) =>
          nextPage === 1 ? searchCrmLeads.rows : [...current, ...searchCrmLeads.rows],
        );
        setTotal(searchCrmLeads.total);
        setPage(nextPage);
      } catch (err) {
        if (id === request.current) setError(errorMessage(err, fallbackError));
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [search, kind, fallbackError],
  );

  useEffect(() => {
    const timer = setTimeout(
      () => fireAndForget(load(1), logs.mobileApp, 'crm-app/useLeadSearch', 'load'),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [load]);

  const hasMore = rows.length < total;
  const loadMore = useCallback(() => {
    if (!loading && hasMore)
      fireAndForget(load(page + 1), logs.mobileApp, 'crm-app/useLeadSearch', 'load');
  }, [loading, hasMore, load, page]);

  return { rows, total, loading, error, hasMore, loadMore, refresh: () => load(1) };
}
