import { useCallback, useState } from 'react';
import type { GigCategory } from '@duncit/utils';

import { GigCategoriesDocument, GigViewerDocument } from '@/graphql/gigs';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefetchOnReturn } from './useRefetchOnReturn';

type Viewer = Awaited<ReturnType<typeof loadViewer>>;

const loadViewer = async () =>
  (await graphqlRequest(GigViewerDocument, {}, { auth: true })).gigViewer;

/**
 * What every gig screen reads beside its own data: the categories (admin
 * master data) and what the viewer may do — post as which roles, are they a
 * freelancer. Re-read on focus, so joining as a freelancer shows on return.
 * mWeb twin: @duncit/gig-jobs useGigContext.
 */
export function useGigContext() {
  const [categories, setCategories] = useState<GigCategory[]>([]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    const [list, me] = await Promise.all([
      graphqlRequest(GigCategoriesDocument, {}, { auth: true }),
      loadViewer(),
    ]);
    setCategories(list.gigCategories);
    setViewer(me);
    setFailed(false);
  }, []);
  const query = useReloadableQuery(load, { onError: () => setFailed(true) });
  useRefetchOnReturn(query.refetch);
  return { categories, viewer, failed, loading: query.isLoading, refetch: query.refetch };
}
