import { useCallback, useState } from 'react';

import type { WindowOffer } from '@/forms/window-offer';
import {
  CancelPodPartnerRequestDocument,
  PodPartnerWindowQuoteDocument,
  ProposePodPartnerWindowDocument,
  RespondPodPartnerRequestDocument,
  RespondPodPartnerSlotDocument,
} from '@/graphql/pod-requests';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/**
 * The four moves on one Pod Request — answer it, withdraw it, propose a time
 * and a price, answer the proposal — and the price of a proposal before it is
 * sent. The server owns the state machine; a stale tap comes back
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
    proposeWindow: (id: string, offer: WindowOffer) =>
      run(() => graphqlRequest(ProposePodPartnerWindowDocument, { id, offer }, { auth: true })),
    priceWindow: async (id: string, offer: WindowOffer) => {
      const res = await graphqlRequest(
        PodPartnerWindowQuoteDocument,
        { id, offer },
        { auth: true },
      );
      return res.podPartnerWindowQuote;
    },
    respondSlot: (id: string, confirm: boolean) =>
      run(() => graphqlRequest(RespondPodPartnerSlotDocument, { id, confirm }, { auth: true })),
  };
}

export type PodRequestActions = ReturnType<typeof usePodRequestActions>;
