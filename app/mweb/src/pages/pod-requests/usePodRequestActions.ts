import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { PROPOSE_POD_PARTNER_WINDOW, type WindowOfferInput } from '@duncit/availability-calendar';
import { parseApiError } from '@duncit/utils';
import {
  CANCEL_POD_PARTNER_REQUEST,
  MY_POD_PARTNER_REQUESTS,
  POD_PARTNER_REQUEST,
  RESPOND_POD_PARTNER_REQUEST,
  RESPOND_POD_PARTNER_SLOT,
} from './queries';

/** Every write re-reads the lists and the open detail, so a row moves tabs at once. */
const REFETCH = { refetchQueries: [MY_POD_PARTNER_REQUESTS, POD_PARTNER_REQUEST], awaitRefetchQueries: true };

/**
 * The four moves on one Pod Request — answer it, withdraw it, propose its
 * time and price, answer the proposal. The server owns the state machine; a stale tap comes back
 * as CONFLICT and its message is shown, never swallowed.
 */
export function usePodRequestActions() {
  const [error, setError] = useState('');
  const [respond, respondState] = useMutation(RESPOND_POD_PARTNER_REQUEST, REFETCH);
  const [cancel, cancelState] = useMutation(CANCEL_POD_PARTNER_REQUEST, REFETCH);
  const [propose, proposeState] = useMutation(PROPOSE_POD_PARTNER_WINDOW, REFETCH);
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
    busy: respondState.loading || cancelState.loading || proposeState.loading || answerState.loading,
    respond: (id: string, accept: boolean) => run(() => respond({ variables: { id, accept } })),
    withdraw: (id: string) => run(() => cancel({ variables: { id } })),
    proposeWindow: (id: string, offer: WindowOfferInput) => run(() => propose({ variables: { id, offer } })),
    respondSlot: (id: string, confirm: boolean) => run(() => answerSlot({ variables: { id, confirm } })),
  };
}

export type PodRequestActions = ReturnType<typeof usePodRequestActions>;
