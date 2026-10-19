import { useCallback, useState } from 'react';
import { logs } from '@duncit/logs';
import { parseApiError, type GigJobFilter, type GigJobRow } from '@duncit/utils';

import { GigJobsDocument, MyGigJobsDocument } from '@/graphql/gigs';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefetchOnReturn } from './useRefetchOnReturn';

const PAGE_SIZE = 20;

/**
 * The board (open gigs, filtered) or the viewer's own posts, a page at a time.
 * "Load more" widens the window rather than appending, so a refresh re-reads
 * exactly what is on screen. mWeb twin: @duncit/gig-jobs usePagedGigs.
 */
export function usePagedGigs(source: 'BOARD' | 'MINE', filter: GigJobFilter = {}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [rows, setRows] = useState<GigJobRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const { category_id, location_id, search } = filter;

  const load = useCallback(async () => {
    const page =
      source === 'MINE'
        ? (await graphqlRequest(MyGigJobsDocument, { offset: 0, limit }, { auth: true })).myGigJobs
        : (
            await graphqlRequest(
              GigJobsDocument,
              { filter: { category_id, location_id, search }, offset: 0, limit },
              { auth: true },
            )
          ).gigJobs;
    setRows(page.rows);
    setTotal(page.total);
    setFailed(false);
  }, [source, limit, category_id, location_id, search]);

  const query = useReloadableQuery(load, {
    onError: (error) => {
      logs.mobileApp.error('GigJobs', 'usePagedGigs', {
        error,
        source,
        reason: parseApiError(error),
      });
      setFailed(true);
    },
  });
  useRefetchOnReturn(query.refetch);

  return {
    rows,
    total,
    failed,
    loading: query.isLoading,
    retry: query.refetch,
    more: () => setLimit((current) => current + PAGE_SIZE),
  };
}
