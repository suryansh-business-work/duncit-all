import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import {
  CANCEL_POD_REQUEST,
  MY_POD_REQUESTS,
  POD_REQUEST_DETAIL,
  REQUEST_POD_REQUEST_SLOT,
  RESPOND_POD_REQUEST,
  RESPOND_POD_REQUEST_SLOT,
} from './queries';

export interface PodRequestNotice {
  severity: 'success' | 'error';
  text: string;
}

/**
 * The four answers a party gives a request — accept/decline, withdraw, send a
 * slot, confirm/decline the slot. Each refetches the lists and the open
 * request, and a refusal from the server lands in `notice` rather than vanishing.
 */
export function usePodRequestActions() {
  const [notice, setNotice] = useState<PodRequestNotice | null>(null);
  const reload = { refetchQueries: [MY_POD_REQUESTS, POD_REQUEST_DETAIL], awaitRefetchQueries: true };
  const [respond, respondState] = useMutation(RESPOND_POD_REQUEST, reload);
  const [cancel, cancelState] = useMutation(CANCEL_POD_REQUEST, reload);
  const [requestSlot, slotState] = useMutation(REQUEST_POD_REQUEST_SLOT, reload);
  const [respondSlot, respondSlotState] = useMutation(RESPOND_POD_REQUEST_SLOT, reload);

  const attempt = useCallback(async (work: () => Promise<unknown>): Promise<boolean> => {
    setNotice(null);
    try {
      await work();
      return true;
    } catch (err) {
      setNotice({ severity: 'error', text: parseApiError(err) });
      return false;
    }
  }, []);

  return {
    notice,
    clearNotice: () => setNotice(null),
    busy: respondState.loading || cancelState.loading || slotState.loading || respondSlotState.loading,
    respond: (id: string, accept: boolean) => attempt(() => respond({ variables: { id, accept } })),
    withdraw: (id: string) => attempt(() => cancel({ variables: { id } })),
    sendSlot: (id: string, slotId: string) => attempt(() => requestSlot({ variables: { id, slot_id: slotId } })),
    respondSlot: (id: string, confirm: boolean) => attempt(() => respondSlot({ variables: { id, confirm } })),
  };
}

export type PodRequestActions = ReturnType<typeof usePodRequestActions>;
