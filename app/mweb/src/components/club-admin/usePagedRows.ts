import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentNode } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';

interface TablePage<Row> {
  rows: Row[];
  total: number;
}

interface Options {
  document: DocumentNode;
  /** The query field the page is read from — `clubAdminPodsTable`, say. */
  field: string;
  /** Variables for one page. Asked again for every page, so the shared part
   * (search, status, club) travels with the page number. */
  variables: (page: number) => Record<string, unknown>;
}

/**
 * A server-paged `<entity>Table` query read one page at a time onto a growing
 * list — the phone's "Load more" over the same documents the Partners console
 * pages with DuncitTable. The list restarts from page one whenever the
 * variables change; an answer that lands after a newer request was sent is
 * dropped rather than merged, so a fast old search can never overwrite a slow
 * new one.
 */
export function usePagedRows<Row>({ document, field, variables }: Options) {
  const client = useApolloClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const build = useRef(variables);
  build.current = variables;
  const request = useRef(0);
  // The first page's variables, as text: the one thing a change must restart on.
  const key = JSON.stringify(variables(1));

  const load = useCallback(
    async (next: number) => {
      request.current += 1;
      const ticket = request.current;
      setLoading(true);
      setError(null);
      try {
        const { data } = await client.query<Record<string, TablePage<Row>>>({
          query: document,
          variables: build.current(next),
          fetchPolicy: 'network-only',
        });
        if (ticket !== request.current) return;
        const answer = data?.[field];
        const fresh = answer?.rows ?? [];
        setRows((previous) => (next === 1 ? fresh : [...previous, ...fresh]));
        setTotal(answer?.total ?? 0);
        setPage(next);
      } catch (caught) {
        if (ticket !== request.current) return;
        setError(parseApiError(caught));
      } finally {
        if (ticket === request.current) setLoading(false);
      }
    },
    [client, document, field],
  );

  useEffect(() => {
    load(1).catch(() => undefined);
    // `key` is the dependency: the builder lives in a ref so a new function
    // identity alone never refetches, but new variables always do.
  }, [load, key]);

  const loadMore = useCallback(() => {
    load(page + 1).catch(() => undefined);
  }, [load, page]);

  const reload = useCallback(() => {
    load(1).catch(() => undefined);
  }, [load]);

  return { rows, total, loading, error, hasMore: rows.length < total, loadMore, reload };
}
