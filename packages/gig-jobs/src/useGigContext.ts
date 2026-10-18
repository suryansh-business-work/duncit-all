import { useQuery } from '@apollo/client/react';
import { fireAndForget } from '@duncit/logs';
import type { GigCategory } from '@duncit/utils';
import { GIG_CATEGORIES, GIG_VIEWER } from './documents';
import { useGigSurface } from './GigSurfaceProvider';

/** One stable empty list, so a memo keyed on the categories does not rerun every render. */
const EMPTY: readonly GigCategory[] = [];

/**
 * What every gig screen reads alongside its own data: the categories (admin
 * master data — they change rarely, so the cache answers repeat visits) and
 * what the viewer may do (post as which roles, are they a freelancer).
 */
export function useGigContext() {
  const { logger } = useGigSurface();
  const categories = useQuery(GIG_CATEGORIES, { fetchPolicy: 'cache-first' });
  const viewer = useQuery(GIG_VIEWER, { fetchPolicy: 'cache-and-network' });
  return {
    categories: categories.data?.gigCategories ?? EMPTY,
    viewer: viewer.data?.gigViewer ?? null,
    loading: (categories.loading && !categories.data) || (viewer.loading && !viewer.data),
    error: !!(categories.error ?? viewer.error),
    retry: () => {
      fireAndForget(categories.refetch(), logger, 'gig-jobs', 'retryCategories');
      fireAndForget(viewer.refetch(), logger, 'gig-jobs', 'retryViewer');
    },
  };
}
