import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MobileUserHostedPodsDocument, MobileUserJoinedPodsDocument } from '@/graphql/profile-pods';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';

export type ProfilePodsKind = 'joined' | 'hosted';
export type ProfilePod = ResultOf<typeof MobileUserJoinedPodsDocument>['userJoinedPods'][number];

/**
 * A profile tab's pods — the ones this member joined, or the ones they host.
 * Twin of the query half of mWeb's `ProfilePodsPanel` (rule 27).
 */
export function useProfilePods(userId: string, kind: ProfilePodsKind) {
  const [pods, setPods] = useState<ProfilePod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    const request =
      kind === 'joined'
        ? graphqlRequest(MobileUserJoinedPodsDocument, { user_id: userId }, { auth: true }).then(
            (data) => data.userJoinedPods,
          )
        : graphqlRequest(MobileUserHostedPodsDocument, { user_id: userId }, { auth: true }).then(
            (data) => data.pods,
          );
    request
      .then((rows) => {
        if (!active) return;
        setPods(rows);
        setError(undefined);
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [userId, kind, attempt]);

  useRefreshRegistration(refetch);

  return { pods, isLoading, error };
}
