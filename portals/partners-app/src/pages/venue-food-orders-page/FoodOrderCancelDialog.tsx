import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { FoodOrderCancelForm, type FoodOrderCancelValues } from './food-order-cancel';
import { foodMoney } from './food-order-labels';
import { CANCEL_VENUE_FOOD_ORDER, type FoodOrderRow } from './queries';

interface Props {
  /** The order being called off; null closes the dialog. */
  order: FoodOrderRow | null;
  onClose: () => void;
  /** The server's copy after the cancel — its payment is refunded, or the refund is on its way. */
  onCancelled: (order: FoodOrderRow) => void;
}

const TITLE_ID = 'food-order-cancel-title';

/**
 * Cancel a paid food order and refund the guest in full on the venue's own
 * Razorpay account. The server makes the cancel and the refund debt one write,
 * so a retry after a failed answer cannot refund twice; a refusal stays in the
 * dialog with the typed reason.
 */
export default function FoodOrderCancelDialog({ order, onClose, onCancelled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [cancel, { loading }] = useMutation(CANCEL_VENUE_FOOD_ORDER);

  const close = () => {
    setApiError(null);
    onClose();
  };

  const submit = async (values: FoodOrderCancelValues) => {
    if (!order) return;
    setApiError(null);
    try {
      const res = await cancel({ variables: { order_id: order.id, reason: values.reason.trim() } });
      const cancelled = res.data?.cancelVenueFoodOrder;
      if (!cancelled) return;
      notifySuccess(
        cancelled.payment_status === 'REFUNDED'
          ? t('partners.foodOrders.cancelledRefunded', { vars: { no: cancelled.order_no } })
          : t('partners.foodOrders.cancelledRefundPending', { vars: { no: cancelled.order_no } }),
      );
      onCancelled(cancelled);
      close();
    } catch (error) {
      setApiError(parseApiError(error));
    }
  };

  return (
    <Dialog open={order !== null} onClose={loading ? undefined : close} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      {order && (
        <>
          <DialogTitle id={TITLE_ID}>{t('partners.foodOrders.cancelTitle', { vars: { no: order.order_no } })}</DialogTitle>
          <DialogContent dividers>
            <FoodOrderCancelForm
              key={order.id}
              consequence={t('partners.foodOrders.cancelBody', {
                vars: { guest: order.customer_name, amount: foodMoney(order, order.total) },
              })}
              busy={loading}
              apiError={apiError}
              onSubmit={submit}
              onCancel={close}
            />
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
