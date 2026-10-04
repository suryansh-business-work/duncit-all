import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Card, CardContent, DialogContentText, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { logs } from '@duncit/logs';
import { FORCE_CANCEL_PRODUCT_ORDER, RETRY_PRODUCT_ORDER_REFUND } from './queries';

/** What this card reads off the order — the detail query's fields. */
export interface CancelRefundOrder {
  id: string;
  channel: string;
  fulfilment_status: string;
  currency_symbol: string;
  total: number;
  cancelled_at: string | null;
  cancel_reason: string;
  cancelled_by: string;
  shiprocket: { awb: string };
  refund: { status: string; amount: number; coins: number; razorpay_refund_id: string; refunded_at: string | null; error: string };
}

const CLOSED = new Set(['DELIVERED', 'PICKED_UP', 'CANCELLED', 'RTO_DELIVERED']);
const IN_TRANSIT = new Set(['SHIPPED', 'OUT_FOR_DELIVERY', 'NDR', 'RTO', 'LOST']);
const REFUND_COLORS: StatusColorMap = { PROCESSED: 'success', RECORDED: 'info', PENDING: 'warning', FAILED: 'error' };

/**
 * Products portal › Order: force-cancel a Pod Shop order (courier stopped,
 * stock back, full refund through Razorpay, apology to the buyer) and follow
 * the refund afterwards. Pet-store orders are run from the E-Commerce portal.
 */
export default function OrderCancelRefundCard({ order }: Readonly<{ order: CancelRefundOrder }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  const [cancel, cancelState] = useMutation(FORCE_CANCEL_PRODUCT_ORDER);
  const [retry, retryState] = useMutation(RETRY_PRODUCT_ORDER_REFUND);

  if (order.channel !== 'POD_SHOP') return null;
  const money = (n: number) => formatMoney(n, { symbol: order.currency_symbol, decimals: 2 });
  const cancellable = !order.cancelled_at && !CLOSED.has(order.fulfilment_status);

  const confirmCancel = async () => {
    if (!reason.trim()) {
      setMissing(true);
      return;
    }
    try {
      await cancel({ variables: { id: order.id, reason: reason.trim() } });
      notifySuccess(t('products.orderCancel.cancelled'));
      setOpen(false);
    } catch (error) {
      logs.portal.products.error('OrderCancelRefundCard', 'cancel', { error });
      notifyError(error instanceof Error ? error.message : t('products.orders.actionFailed'));
    }
  };

  const retryRefund = async () => {
    try {
      await retry({ variables: { id: order.id } });
      notifySuccess(t('products.orderCancel.retried'));
    } catch (error) {
      logs.portal.products.error('OrderCancelRefundCard', 'retryRefund', { error });
      notifyError(error instanceof Error ? error.message : t('products.orders.actionFailed'));
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }} data-testid="order-cancel-refund">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('products.orderCancel.title')}
          </Typography>
          {order.cancelled_at ? (
            <>
              <Typography variant="body2">
                {t('products.orderCancel.cancelledOn', {
                  vars: { when: formatDateTime(order.cancelled_at), by: order.cancelled_by || '—' },
                })}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {order.cancel_reason}
              </Typography>
              {order.refund.status !== 'NONE' && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusChip status={order.refund.status} colorMap={REFUND_COLORS} />
                  <Typography variant="body2">
                    {t('products.orderCancel.refundLine', {
                      vars: { amount: money(order.refund.amount), coins: String(order.refund.coins) },
                    })}
                  </Typography>
                </Stack>
              )}
              {order.refund.razorpay_refund_id && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('products.orderCancel.razorpayRef', { vars: { id: order.refund.razorpay_refund_id } })}
                </Typography>
              )}
              {order.refund.status === 'FAILED' && (
                <Alert
                  severity="error"
                  action={
                    <DuncitButton color="inherit" size="small" loading={retryState.loading} onClick={retryRefund}>
                      {t('products.orderCancel.retryRefund')}
                    </DuncitButton>
                  }
                >
                  {t('products.orderCancel.refundFailed', { vars: { error: order.refund.error } })}
                </Alert>
              )}
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('products.orderCancel.hint', { vars: { amount: money(order.total) } })}
              </Typography>
              <DuncitButton
                variant="outlined"
                color="error"
                disabled={!cancellable}
                onClick={() => setOpen(true)}
                data-testid="order-force-cancel"
                sx={{ alignSelf: 'flex-start' }}
              >
                {t('products.orderCancel.action')}
              </DuncitButton>
            </>
          )}
        </Stack>
      </CardContent>
      <ConfirmDialog
        open={open}
        title={t('products.orderCancel.confirmTitle')}
        message={
          <Stack spacing={2}>
            <DialogContentText>{t('products.orderCancel.confirmBody', { vars: { amount: money(order.total) } })}</DialogContentText>
            {IN_TRANSIT.has(order.fulfilment_status) && (
              <Alert severity="warning">{t('products.orderCancel.inTransit', { vars: { awb: order.shiprocket.awb || '—' } })}</Alert>
            )}
            <TextField
              label={t('products.orderCancel.reason')}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setMissing(false);
              }}
              required
              multiline
              minRows={2}
              error={missing}
              helperText={missing ? t('products.orderCancel.reasonRequired') : t('products.orderCancel.reasonHint')}
              data-testid="order-force-cancel-reason"
            />
          </Stack>
        }
        confirmLabel={t('products.orderCancel.action')}
        destructive
        loading={cancelState.loading}
        onClose={() => setOpen(false)}
        onConfirm={confirmCancel}
      />
    </Card>
  );
}
