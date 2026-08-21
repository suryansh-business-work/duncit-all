import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { HostPodPendingViewDocument } from '@/graphql/pod-pending';
import { graphqlRequest } from '@/services/graphql.client';

export type PodPendingView = ResultOf<typeof HostPodPendingViewDocument>['hostPodPendingView'];

/** Loads the host-only pending view (pod summary + venue + club-admin contacts)
 * for the post-create waiting screen. The venue's answer lands outside the app,
 * so `refetch` is part of the contract — the screen wires it to a refresh button
 * and to pull-to-refresh. RN twin of mWeb's pending-view query. */
export function usePodPendingView(podId: string) {
  const [view, setView] = useState<PodPendingView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>();
  // A screen unmounted mid-request must not set state; every load reads this.
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const load = useCallback(async (podDocId: string) => {
    try {
      const d = await graphqlRequest(
        HostPodPendingViewDocument,
        { pod_doc_id: podDocId },
        { auth: true },
      );
      if (active.current) {
        setView(d.hostPodPendingView);
        setError(undefined);
      }
    } catch (e) {
      if (active.current) setError(e);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    load(podId)
      .catch(() => undefined)
      .finally(() => {
        if (active.current) setIsLoading(false);
      });
  }, [load, podId]);

  /** Re-asks the server for the venue's decision, keeping the current card on
   * screen — the pull spinner is the only thing that moves. */
  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    await load(podId);
    if (active.current) setIsRefreshing(false);
  }, [load, podId]);

  return { view, isLoading, isRefreshing, error, refetch };
}
