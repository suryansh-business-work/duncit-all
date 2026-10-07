import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { parseApiError } from '@duncit/utils';
import {
  CANCEL_POD_PARTNER_REQUEST,
  MY_POD_PARTNER_REQUESTS,
  POD_PARTNER_REQUEST,
  REQUEST_POD_PARTNER_SLOT,
  RESPOND_POD_PARTNER_REQUEST,
  RESPOND_POD_PARTNER_SLOT,
} from './queries';

/** Every write re-reads the lists and the open detail, so a row moves tabs at once. */
const REFETCH = { refetchQueries: [MY_POD_PARTNER_REQUESTS, POD_PARTNER_REQUEST], awaitRefetchQueries: true };

/**
 * The four moves on one Pod Request — answer it, withdraw it, pick its slot,
 * answer the slot. The server owns the state machine; a stale tap comes back
 * as CONFLICT and its message is shown, never swallowed.
 */
export function usePodRequestActions() {
  const [error, setError] = useState('');
  const [respond, respondState] = useMutation(RESPOND_POD_PARTNER_REQUEST, REFETCH);
  const [cancel, cancelState] = useMutation(CANCEL_POD_PARTNER_REQUEST, REFETCH);
  const [pickSlot, pickState] = useMutation(REQUEST_POD_PARTNER_SLOT, REFETCH);
  const [answerSlot, answerState] = useMutation(RESPOND_POD_PARTNER_SLOT, REFETCH);

  const run = async (write: () => Promise<unknown>): Promise<boolean> => {
    setError('');
    try {
      await write();
      return true;
    } catch (err) {
      setError(parseApiError(err));
      return false;
    }
  };

  return {
    error,
    clearError: () => setError(''),
    busy: respondState.loading || cancelState.loading || pickState.loading || answerState.loading,
    respond: (id: string, accept: boolean) => run(() => respond({ variables: { id, accept } })),
    withdraw: (id: string) => run(() => cancel({ variables: { id } })),
    requestSlot: (id: string, slotId: string) => run(() => pickSlot({ variables: { id, slot_id: slotId } })),
    respondSlot: (id: string, confirm: boolean) => run(() => answerSlot({ variables: { id, confirm } })),
  };
}

export type PodRequestActions = ReturnType<typeof usePodRequestActions>;
