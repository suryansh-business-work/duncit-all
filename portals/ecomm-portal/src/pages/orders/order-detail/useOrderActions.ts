import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { runAction } from '../../../lib/actions';
import type { RefundMode } from '../../../lib/status';
import { ADD_ORDER_NOTE, CANCEL_ORDER, MARK_COD_COLLECTED, UPDATE_ORDER_STATUS } from '../queries';

/** Money moves on these, so the payment panel and the order's returns are read again after them. */
const MONEY_REFRESH = { refetchQueries: ['StoreAdminOrder', 'StoreReturnsForOrder'] };

/**
 * Every write an operator makes on one order. Each answers whether it went
 * through; the order itself refreshes in place from the mutation's answer.
 */
export function useOrderActions(id: string) {
  const { t } = useTranslation();
  const [updateStatus, statusState] = useMutation(UPDATE_ORDER_STATUS);
  const [addNote, noteState] = useMutation(ADD_ORDER_NOTE);
  const [cancel, cancelState] = useMutation(CANCEL_ORDER, MONEY_REFRESH);
  const [markCod, codState] = useMutation(MARK_COD_COLLECTED, MONEY_REFRESH);
  const busy = [statusState, noteState, cancelState, codState].some((state) => state.loading);
  return {
    busy,
    noteBusy: noteState.loading,
    cancelBusy: cancelState.loading,
    setStatus: (status: string, note: string) =>
      runAction(() => updateStatus({ variables: { id, status, note: note || null } }), t('ecommPortal.orders.statusUpdated')),
    addNote: (text: string) => runAction(() => addNote({ variables: { id, text } }), t('ecommPortal.orders.noteAdded')),
    cancel: (reason: string, refundMode: RefundMode) =>
      runAction(() => cancel({ variables: { id, reason, refund_mode: refundMode } }), t('ecommPortal.orders.cancelled')),
    markCodCollected: () => runAction(() => markCod({ variables: { id } }), t('ecommPortal.orders.codCollected')),
  };
}

export type OrderActions = ReturnType<typeof useOrderActions>;
