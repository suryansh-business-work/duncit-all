import { useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { HOST_AGAIN_POD } from './queries';
import { useHostPodActionsConfig } from './HostPodActionsProvider';

/**
 * "Host again" for one pod: asks the server for a draft copy of it, then hands
 * the draft id to the surface, which opens it in its own Create Pod route.
 *
 * Undefined on a surface that has no Create Pod draft route — the menu then
 * leaves the row out instead of offering something it cannot open. A second
 * tap while the first copy is still being made is ignored, so a quick double
 * tap never leaves the host with two identical drafts.
 */
export function useHostAgain(): ((podId: string) => void) | undefined {
  const { labels, notifyError, onHostAgainDraft } = useHostPodActionsConfig();
  const [hostAgainPod] = useMutation<{ hostAgainPod: { id: string } }>(HOST_AGAIN_POD);
  const busy = useRef(false);
  if (!onHostAgainDraft) return undefined;

  return (podId: string) => {
    if (busy.current) return;
    busy.current = true;
    hostAgainPod({ variables: { pod_doc_id: podId } })
      .then((res) => {
        const draftId = res.data?.hostAgainPod.id;
        if (draftId) onHostAgainDraft(draftId);
        else notifyError(labels.hostAgainFailed);
      })
      .catch(() => notifyError(labels.hostAgainFailed))
      .finally(() => {
        busy.current = false;
      });
  };
}
