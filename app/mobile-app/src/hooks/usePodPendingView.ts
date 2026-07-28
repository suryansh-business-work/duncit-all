import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { HostPodPendingViewDocument } from '@/graphql/pod-pending';
import { graphqlRequest } from '@/services/graphql.client';

export type PodPendingView = ResultOf<typeof HostPodPendingViewDocument>['hostPodPendingView'];

/** Loads the host-only pending view (pod summary + venue + club-admin contacts)
 * for the post-create waiting screen. RN twin of mWeb's pending-view query. */
export function usePodPendingView(podId: string) {
  const [view, setView] = useState<PodPendingView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    graphqlRequest(HostPodPendingViewDocument, { pod_doc_id: podId }, { auth: true })
      .then((d) => {
        if (active) setView(d.hostPodPendingView);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [podId]);

  return { view, isLoading, error };
}
