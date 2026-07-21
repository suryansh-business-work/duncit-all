import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { HostPodsDocument } from '@/graphql/host-manage';
import { graphqlRequest } from '@/services/graphql.client';
import { useMe } from '@/hooks/useMe';

export type HostPod = ResultOf<typeof HostPodsDocument>['myHostPods'][number];

/** Pods the signed-in host runs — powers the "Your pods" list on Hosts
 * Management (same host-scoped query as mWeb's Host Studio, including pods
 * awaiting or refused venue approval). */
export function useHostPods() {
  const me = useMe().data?.me;
  const userId = me?.user_id ?? null;
  const [pods, setPods] = useState<HostPod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await graphqlRequest(HostPodsDocument, undefined, { auth: true });
    setPods(res.myHostPods);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setIsLoading(true);
    load()
      .catch(() => undefined)
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [userId, load]);

  return { pods, isLoading, refetch: load };
}
