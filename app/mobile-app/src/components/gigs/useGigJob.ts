import { useCallback, useState } from 'react';
import type { GigJob } from '@duncit/utils';

import { GigJobDocument } from '@/graphql/gigs';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefetchOnReturn } from './useRefetchOnReturn';

/**
 * One gig as the viewer may see it. `replace` takes the copy a mutation
 * answered with (interest shared, closed, reopened) so the screen updates
 * without a second request. `missing` = the server has no such gig.
 */
export function useGigJob(id: string, enabled = true) {
  const [job, setJob] = useState<GigJob | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    const found = (await graphqlRequest(GigJobDocument, { id }, { auth: true })).gigJob;
    setJob(found ?? null);
    setMissing(!found);
    setFailed(false);
  }, [id]);
  const query = useReloadableQuery(load, { enabled, onError: () => setFailed(true) });
  const { refetch } = query;
  useRefetchOnReturn(
    useCallback(() => (enabled ? refetch() : Promise.resolve()), [enabled, refetch]),
  );
  return {
    job,
    missing,
    failed,
    loading: query.isLoading,
    refetch: query.refetch,
    replace: setJob,
  };
}
