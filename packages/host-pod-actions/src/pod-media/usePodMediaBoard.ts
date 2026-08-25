import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import type { PodMediaLabels } from '@duncit/utils';
import {
  ADD_POD_PARTY_MEDIA,
  POD_MEDIA_BOARD,
  REMOVE_POD_PARTY_MEDIA,
  type PodMediaBoard,
} from './queries';

export interface PodMediaBoardApi {
  board: PodMediaBoard | null;
  loading: boolean;
  failed: boolean;
  /** A write is in flight — the picker and the remove buttons wait for it. */
  busy: boolean;
  refetch: () => void;
  add: (urls: string[]) => Promise<void>;
  remove: (url: string) => Promise<void>;
}

interface Options {
  podId: string;
  labels: PodMediaLabels;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}

/**
 * Reading and writing one pod's media.
 *
 * Every write answers with the whole board, so the list on screen is what the
 * server has rather than what the client hoped it now had — a guest's upload
 * arriving while the host has the page open is picked up by the next write or
 * a refetch, never guessed at.
 */
export function usePodMediaBoard({
  podId,
  labels,
  notifySuccess,
  notifyError,
}: Readonly<Options>): PodMediaBoardApi {
  const { data, loading, error, refetch } = useQuery<{ podMediaBoard: PodMediaBoard }>(
    POD_MEDIA_BOARD,
    { variables: { pod_doc_id: podId }, fetchPolicy: 'cache-and-network', skip: !podId },
  );
  const [addMedia, addState] = useMutation(ADD_POD_PARTY_MEDIA);
  const [removeMedia, removeState] = useMutation(REMOVE_POD_PARTY_MEDIA);
  const [failedWrite, setFailedWrite] = useState(false);

  const add = useCallback(
    async (urls: string[]) => {
      if (urls.length === 0) return;
      setFailedWrite(false);
      try {
        await addMedia({ variables: { pod_doc_id: podId, media: urls.map((url) => ({ url })) } });
        notifySuccess(labels.added(urls.length));
      } catch (e) {
        setFailedWrite(true);
        notifyError(e instanceof Error ? e.message : labels.loadFailed);
      }
    },
    [addMedia, podId, labels, notifySuccess, notifyError],
  );

  const remove = useCallback(
    async (url: string) => {
      setFailedWrite(false);
      try {
        await removeMedia({ variables: { pod_doc_id: podId, url } });
        notifySuccess(labels.removed);
      } catch (e) {
        setFailedWrite(true);
        notifyError(e instanceof Error ? e.message : labels.loadFailed);
      }
    },
    [removeMedia, podId, labels, notifySuccess, notifyError],
  );

  return {
    board: data?.podMediaBoard ?? null,
    loading: loading && !data,
    failed: (!!error && !data) || failedWrite,
    busy: addState.loading || removeState.loading,
    refetch: () => {
      refetch().catch(() => undefined);
    },
    add,
    remove,
  };
}
