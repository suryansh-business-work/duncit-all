import { useCallback, useState } from 'react';
import type { DocumentNode } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { Translate } from '../brand-wizard/wizard-steps';
import {
  APPROVE_RETURN,
  MARK_RETURN_RECEIVED,
  REFUND_RETURN,
  REJECT_RETURN,
  RETRY_RETURN_PICKUP,
  RETRY_RETURN_REFUND,
  type ReturnRow,
} from './returns.queries';

export type ReturnAction = 'approve' | 'reject' | 'retryPickup' | 'received' | 'refund' | 'retryRefund';

const ACTIONS: Record<ReturnAction, { mutation: DocumentNode; resultKey: string }> = {
  approve: { mutation: APPROVE_RETURN, resultKey: 'approvePodShopReturn' },
  reject: { mutation: REJECT_RETURN, resultKey: 'rejectPodShopReturn' },
  retryPickup: { mutation: RETRY_RETURN_PICKUP, resultKey: 'retryPodShopReturnPickup' },
  received: { mutation: MARK_RETURN_RECEIVED, resultKey: 'markPodShopReturnReceived' },
  refund: { mutation: REFUND_RETURN, resultKey: 'refundPodShopReturn' },
  retryRefund: { mutation: RETRY_RETURN_REFUND, resultKey: 'retryPodShopReturnRefund' },
};

function successText(t: Translate, action: ReturnAction): string {
  switch (action) {
    case 'approve':
      return t('partners.returns.approved');
    case 'reject':
      return t('partners.returns.rejected');
    case 'retryPickup':
      return t('partners.returns.pickupRetried');
    case 'received':
      return t('partners.returns.markedReceived');
    default:
      return t('partners.returns.refundSent');
  }
}

/** Runs one return action, reports it, and hands back the updated return. */
export function useReturnActions(onUpdated: (row: ReturnRow) => void) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [busy, setBusy] = useState<ReturnAction | null>(null);

  const run = useCallback(
    async (action: ReturnAction, id: string, note?: string | null): Promise<boolean> => {
      const { mutation, resultKey } = ACTIONS[action];
      setBusy(action);
      try {
        const variables = note === undefined ? { id } : { id, note };
        const { data } = await client.mutate<Record<string, ReturnRow>>({ mutation, variables });
        const row = data?.[resultKey];
        // Razorpay can refuse a refund without the mutation failing — the return then carries the error.
        if (row?.refund.status === 'FAILED' && (action === 'refund' || action === 'retryRefund')) {
          notifyError(t('partners.returns.refundFailed', { vars: { error: row.refund.error } }));
        } else {
          notifySuccess(successText(t, action));
        }
        if (row) onUpdated(row);
        return true;
      } catch (error) {
        notifyError(parseApiError(error));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [client, onUpdated, t],
  );

  return { run, busy };
}
