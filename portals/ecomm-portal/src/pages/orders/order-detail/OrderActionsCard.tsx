import { useState } from 'react';
import { Alert, Divider, Stack } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CancelIcon from '@mui/icons-material/Cancel';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import { money } from '../../../lib/format';
import { CANCELLABLE_ORDER_STATUSES } from '../../../lib/status';
import type { StoreAdminOrder } from '../queries';
import OrderCancelForm from './order-cancel';
import OrderStatusForm from './order-status';
import type { OrderActions } from './useOrderActions';

/** What can be done to the order now: move it, settle its cash, or call it off. Shipping has its own card. */
export default function OrderActionsCard({ detail, actions }: Readonly<{ detail: StoreAdminOrder; actions: OrderActions }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [cancelling, setCancelling] = useState(false);
  const { order } = detail;
  const cancelled = Boolean(order.cancelled_at);
  const codOpen = order.payment_method === 'COD' && !order.cod_collected_at && !cancelled;
  const canCancel = !cancelled && CANCELLABLE_ORDER_STATUSES.has(order.fulfilment_status);

  const markCod = async () => {
    const ok = await confirm({
      title: t('ecommPortal.orders.codConfirmTitle'),
      message: t('ecommPortal.orders.codConfirmMessage', { vars: { amount: money(order.cod_amount, order.currency_symbol) } }),
      confirmLabel: t('ecommPortal.orders.markCod'),
      cancelLabel: t('shell.common.cancel'),
    });
    if (ok) await actions.markCodCollected();
  };

  if (cancelled) {
    return (
      <SectionCard title={t('ecommPortal.orders.actions')}>
        <Alert severity="warning">{t('ecommPortal.orders.cancelledBecause', { vars: { reason: order.cancel_reason, by: order.cancelled_by } })}</Alert>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t('ecommPortal.orders.actions')}>
      <OrderStatusForm key={order.fulfilment_status} current={order.fulfilment_status} busy={actions.busy} onSubmit={actions.setStatus} />
      {(codOpen || canCancel) && <Divider sx={{ my: 2 }} />}
      <Stack spacing={1}>
        {codOpen && (
          <DuncitButton variant="outlined" color="success" startIcon={<PaymentsIcon />} disabled={actions.busy} onClick={markCod}>
            {t('ecommPortal.orders.markCod')}
          </DuncitButton>
        )}
        {canCancel && (
          <DuncitButton variant="outlined" color="error" startIcon={<CancelIcon />} disabled={actions.busy} onClick={() => setCancelling(true)}>
            {t('ecommPortal.orders.cancelOrder')}
          </DuncitButton>
        )}
      </Stack>
      {cancelling && (
        <OrderCancelForm
          orderNo={order.order_no}
          isGuest={detail.is_guest}
          busy={actions.cancelBusy}
          onClose={() => setCancelling(false)}
          onSubmit={actions.cancel}
        />
      )}
    </SectionCard>
  );
}
