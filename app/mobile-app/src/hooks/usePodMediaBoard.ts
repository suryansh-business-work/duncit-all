import { useCallback, useEffect, useState } from 'react';

import {
  AddPodPartyMediaDocument,
  PodMediaBoardDocument,
  RemovePodPartyMediaDocument,
} from '@/graphql/pod-media';
import { graphqlRequest } from '@/services/graphql.client';

/** In what capacity this account is looking at a pod's media. */
export type PodMediaViewer = 'HOST' | 'GUEST' | 'NONE';

export interface PodMediaItem {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  source: 'HOST' | 'GUEST';
  uploaded_by_id: string;
  uploaded_by_name: string;
  uploaded_at?: string | null;
  mine: boolean;
  can_remove: boolean;
}

export interface PodMediaBoard {
  pod_id: string;
  pod_title: string;
  pod_date_time?: string | null;
  viewer: PodMediaViewer;
  can_upload: boolean;
  is_cancelled: boolean;
  count: number;
  items: PodMediaItem[];
}

/**
 * One pod's media, as state.
 *
 * The Tamagui twin of `@duncit/host-pod-actions`' `usePodMediaBoard` (rule
 * 27). The two cannot literally be one hook — that one is built on Apollo and
 * this app has no Apollo at all — but every write answers with the whole board
 * on both, so neither guesses at what the server now holds.
 */
export function usePodMediaBoard(podId: string) {
  const [board, setBoard] = useState<PodMediaBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await graphqlRequest(PodMediaBoardDocument, { pod_doc_id: podId }, { auth: true });
    setBoard(res.podMediaBoard as PodMediaBoard);
    setError('');
  }, [podId]);

  const refetch = useCallback(() => {
    load().catch((e: unknown) => setError((e as Error)?.message ?? ''));
  }, [load]);

  useEffect(() => {
    if (!podId) return;
    let active = true;
    setIsLoading(true);
    load()
      .catch((e: unknown) => active && setError((e as Error)?.message ?? ''))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [podId, load]);

  const add = useCallback(
    async (urls: string[]) => {
      if (urls.length === 0) return;
      setBusy(true);
      try {
        const res = await graphqlRequest(
          AddPodPartyMediaDocument,
          { pod_doc_id: podId, media: urls.map((url) => ({ url })) },
          { auth: true },
        );
        setBoard(res.addPodPartyMedia as PodMediaBoard);
        setError('');
      } catch (e) {
        setError((e as Error)?.message ?? '');
      } finally {
        setBusy(false);
      }
    },
    [podId],
  );

  const remove = useCallback(
    async (url: string) => {
      setBusy(true);
      try {
        const res = await graphqlRequest(
          RemovePodPartyMediaDocument,
          { pod_doc_id: podId, url },
          { auth: true },
        );
        setBoard(res.removePodPartyMedia as PodMediaBoard);
        setError('');
      } catch (e) {
        setError((e as Error)?.message ?? '');
      } finally {
        setBusy(false);
      }
    },
    [podId],
  );

  return { board, isLoading, error, busy, refetch, add, remove };
}
