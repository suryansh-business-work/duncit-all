import { useCallback, useState } from 'react';

import {
  CancelPodPartnerRequestDocument,
  RequestPodPartnerSlotDocument,
  RespondPodPartnerRequestDocument,
  RespondPodPartnerSlotDocument,
} from '@/graphql/pod-requests';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/**
 * The four moves on one Pod Request — answer it, withdraw it, pick its slot,
 * answer the slot. The server owns the state machine; a stale tap comes back
 * as CONFLICT and its message is shown, never swallowed. `reload` re-reads
 * whatever the caller is showing, so a row moves tabs at once (mWeb twin:
 * pod-requests/usePodRequestActions).
 */
export function usePodRequestActions(reload: () => Promise<unknown>) {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (write: () => Promise<unknown>): Promise<boolean> => {
      setError('');
      setBusy(true);
      try {
        await write();
        await reload();
        return true;
      } catch (err) {
        setError(toErrorMessage(err, t('mweb.account.somethingWentWrong')));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [reload, t],
  );

  return {
    error,
    clearError: () => setError(''),
    busy,
    respond: (id: string, accept: boolean) =>
      run(() => graphqlRequest(RespondPodPartnerRequestDocument, { id, accept }, { auth: true })),
    withdraw: (id: string) =>
      run(() => graphqlRequest(CancelPodPartnerRequestDocument, { id }, { auth: true })),
    requestSlot: (id: string, slotId: string) =>
      run(() =>
        graphqlRequest(RequestPodPartnerSlotDocument, { id, slot_id: slotId }, { auth: true }),
      ),
    respondSlot: (id: string, confirm: boolean) =>
      run(() => graphqlRequest(RespondPodPartnerSlotDocument, { id, confirm }, { auth: true })),
  };
}

export type PodRequestActions = ReturnType<typeof usePodRequestActions>;
