import { useMutation } from '@apollo/client/react';
import type { DocumentNode } from '@apollo/client';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import {
  APPROVE_RETURN,
  MARK_RETURN_RECEIVED,
  REFUND_RETURN,
  REJECT_RETURN,
  RETRY_RETURN_PICKUP,
  RETRY_RETURN_REFUND,
} from './queries';
import { RETURN_DONE_KEY } from './labels';

export type ReturnAction = 'approve' | 'reject' | 'retryPickup' | 'received' | 'refund' | 'retryRefund';

const DOCS: Record<ReturnAction, DocumentNode> = {
  approve: APPROVE_RETURN,
  reject: REJECT_RETURN,
  retryPickup: RETRY_RETURN_PICKUP,
  received: MARK_RETURN_RECEIVED,
  refund: REFUND_RETURN,
  retryRefund: RETRY_RETURN_REFUND,
};

/** Every action on a return, one mutation each; the result updates the row in Apollo's cache. */
export function useReturnActions(onDone: () => void) {
  const { t } = useTranslation();
  const [approve, a] = useMutation(DOCS.approve);
  const [reject, b] = useMutation(DOCS.reject);
  const [retryPickup, c] = useMutation(DOCS.retryPickup);
  const [received, d] = useMutation(DOCS.received);
  const [refund, e] = useMutation(DOCS.refund);
  const [retryRefund, f] = useMutation(DOCS.retryRefund);
  const calls = { approve, reject, retryPickup, received, refund, retryRefund };
  const busy = [a, b, c, d, e, f].some((s) => s.loading);

  const run = async (action: ReturnAction, id: string, note?: string) => {
    try {
      const decides = action === 'approve' || action === 'reject';
      await calls[action]({ variables: decides ? { id, note: note || null } : { id } });
      notifySuccess(t(RETURN_DONE_KEY[action]));
      onDone();
      return true;
    } catch (error) {
      logs.portal.products.error('useReturnActions', action, { error });
      notifyError(error instanceof Error ? error.message : t('products.orders.actionFailed'));
      return false;
    }
  };
  return { run, busy };
}
