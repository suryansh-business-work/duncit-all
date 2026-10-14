import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { foodOrderCancelledMessage, foodOrderMoney, parseApiError, type FoodOwnerOrder } from '@duncit/utils';
import { CANCEL_VENUE_FOOD_ORDER } from '../documents';
import { FoodOrderCancelForm, type FoodOrderCancelValues } from './food-order-cancel';

interface Props {
  /** The order being called off; null closes the dialog. */
  order: FoodOwnerOrder | null;
  onClose: () => void;
  /** The server's copy after the cancel — its payment is refunded, or the refund is on its way. */
  onCancelled: (order: FoodOwnerOrder) => void;
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
      notifySuccess(foodOrderCancelledMessage(t, cancelled));
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
          <DialogTitle id={TITLE_ID}>{t('venueFoodOwner.orders.cancelTitle', { vars: { no: order.order_no } })}</DialogTitle>
          <DialogContent dividers>
            <FoodOrderCancelForm
              key={order.id}
              consequence={t('venueFoodOwner.orders.cancelBody', {
                vars: { guest: order.customer_name, amount: foodOrderMoney(order, order.total) },
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
