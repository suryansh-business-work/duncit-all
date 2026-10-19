import { useQuery } from '@apollo/client/react';
import { fireAndForget } from '@duncit/logs';
import type { GigJobFilter, GigJobRow } from '@duncit/utils';
import { GIG_JOBS, MY_GIG_JOBS } from '../documents';
import { useGigSurface } from '../GigSurfaceProvider';
import { useLoggedError } from '../useLoggedError';

export const GIG_PAGE_SIZE = 20;

export interface PagedGigs {
  rows: GigJobRow[];
  total: number;
  loading: boolean;
  error: boolean;
  retry: () => void;
  more: () => void;
}

/** One page more at a time, appended onto what is shown. */
function appendPage<T extends { rows: GigJobRow[]; total: number }>(prev: T, next: T): T {
  return { ...next, rows: [...prev.rows, ...next.rows] };
}

/** The open-gig board, filtered. A changed filter is a fresh first page. */
export function useGigBoard(filter: GigJobFilter): PagedGigs {
  const { logger } = useGigSurface();
  const { data, previousData, loading, error, refetch, fetchMore } = useQuery(GIG_JOBS, {
    variables: { filter, offset: 0, limit: GIG_PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  useLoggedError(error, 'gig-jobs', 'useGigBoard');
  const page = (data ?? previousData)?.gigJobs;
  const rows = page?.rows ?? [];
  return {
    rows,
    total: page?.total ?? 0,
    loading,
    error: !!error,
    retry: () => fireAndForget(refetch(), logger, 'gig-jobs', 'retry'),
    more: () =>
      fireAndForget(
        fetchMore({
          variables: { filter, offset: rows.length, limit: GIG_PAGE_SIZE },
          updateQuery: (prev, { fetchMoreResult }) => ({ gigJobs: appendPage(prev.gigJobs, fetchMoreResult.gigJobs) }),
        }),
        logger,
        'gig-jobs',
        'loadMore',
      ),
  };
}

/** The viewer's own posts, open and closed. */
export function useMyGigs(): PagedGigs {
  const { logger } = useGigSurface();
  const { data, loading, error, refetch, fetchMore } = useQuery(MY_GIG_JOBS, {
    variables: { offset: 0, limit: GIG_PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
  useLoggedError(error, 'my-gigs', 'useMyGigs');
  const rows = data?.myGigJobs.rows ?? [];
  return {
    rows,
    total: data?.myGigJobs.total ?? 0,
    loading,
    error: !!error,
    retry: () => fireAndForget(refetch(), logger, 'gig-jobs', 'retry'),
    more: () =>
      fireAndForget(
        fetchMore({
          variables: { offset: rows.length, limit: GIG_PAGE_SIZE },
          updateQuery: (prev, { fetchMoreResult }) => ({ myGigJobs: appendPage(prev.myGigJobs, fetchMoreResult.myGigJobs) }),
        }),
        logger,
        'my-gigs',
        'loadMore',
      ),
  };
}
