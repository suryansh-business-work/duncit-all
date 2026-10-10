import { useCallback, useState } from 'react';

import { PodChallengesDocument } from '@/graphql/challenges';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * The challenges of one pod as the server lets this viewer see them (a host
 * also sees drafts). A failed read leaves the list empty and reports the
 * reason, so a pod page never breaks because its challenges did not load.
 */
export function usePodChallenges(podId: string) {
  const [challenges, setChallenges] = useState<PodChallengeView[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await graphqlRequest(PodChallengesDocument, { podId }, { auth: true });
    setChallenges(res.podChallenges);
    setError('');
  }, [podId]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: Boolean(podId),
    onError: (e) => setError((e as Error)?.message ?? ''),
  });

  return { challenges, isLoading, error, refetch };
}
