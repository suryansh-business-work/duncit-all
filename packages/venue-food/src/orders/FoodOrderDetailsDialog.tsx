import { Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow, StatusChip } from '@duncit/ui';
import {
  FOOD_ORDER_STATUS_COLORS,
  FOOD_PAYMENT_STATUS_COLORS,
  foodDietLabel,
  foodOrderMoney,
  foodOrderMoneyLines,
  foodOrderStatusLabel,
  foodPaymentStatusLabel,
  type FoodOwnerOrder,
} from '@duncit/utils';
import FoodFeedbackBody from '../FoodFeedbackBody';

interface Props {
  /** The order on show; null closes the dialog. */
  order: FoodOwnerOrder | null;
  onClose: () => void;
}

const TITLE_ID = 'food-order-details-title';

function Line({ label, value }: Readonly<{ label: string; value: string }>) {
  return <InfoRow variant="inline" labelWidth={130} labelVariant="caption" labelWeight={700} label={label} value={value || '—'} />;
}

/** One food order in full: the guest, each dish, the note for the kitchen and how the total was reached. */
export default function FoodOrderDetailsDialog({ order, onClose }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={order !== null} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={TITLE_ID}>
      {order && (
        <>
          <DialogTitle id={TITLE_ID}>{t('venueFoodOwner.orders.orderNo', { vars: { no: order.order_no } })}</DialogTitle>
          <DialogContent dividers data-testid="food-order-details">
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <StatusChip status={order.status} colorMap={FOOD_ORDER_STATUS_COLORS} label={foodOrderStatusLabel(t, order.status)} />
                <StatusChip
                  status={order.payment_status}
                  colorMap={FOOD_PAYMENT_STATUS_COLORS}
                  label={foodPaymentStatusLabel(t, order.payment_status)}
                />
              </Stack>
              <Stack spacing={0.75}>
                <Line label={t('venueFoodOwner.orders.colPlaced')} value={formatDateTime(order.created_at)} />
                <Line label={t('venueFoodOwner.orders.colGuest')} value={order.customer_name} />
                <Line label={t('venueFoodOwner.orders.colPhone')} value={order.customer_phone} />
                <Line label={t('venueFoodOwner.orders.colTable')} value={order.table_label} />
                <Line label={t('venueFoodOwner.orders.note')} value={order.note} />
                {order.cancel_reason && <Line label={t('venueFoodOwner.orders.cancelReason')} value={order.cancel_reason} />}
                {order.subscribe_events && (
                  <Line label={t('venueFoodOwner.orders.eventUpdates')} value={t('venueFoodOwner.orders.subscribedToEvents')} />
                )}
              </Stack>
              <Divider flexItem />
              <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
                {t('venueFoodOwner.orders.colItems')}
              </Typography>
              <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {order.items.map((line) => (
                  <Stack
                    key={line.item_id}
                    component="li"
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                      {t('venueFoodOwner.orders.itemLine', { vars: { qty: line.quantity, name: line.name } })}
                      <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                        {' · '}
                        {foodDietLabel(t, line.diet)}
                        {' · '}
                        {t('venueFoodOwner.orders.unitPrice', { vars: { price: foodOrderMoney(order, line.unit_price) } })}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
                      {foodOrderMoney(order, line.line_total)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Divider flexItem />
              <Stack spacing={0.75}>
                {foodOrderMoneyLines(t, order).map((line) => (
                  <Line key={line.key} label={line.label} value={line.value} />
                ))}
              </Stack>
              {order.feedback && (
                <>
                  <Divider flexItem />
                  <Stack spacing={0.75}>
                    <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
                      {t('venueFoodOwner.orders.feedback')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('venueFoodOwner.orders.feedbackAt', { vars: { when: formatDateTime(order.feedback.submitted_at) } })}
                    </Typography>
                    <FoodFeedbackBody feedback={order.feedback} data-testid="food-order-feedback" />
                  </Stack>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <DuncitButton onClick={onClose}>{t('venueFoodOwner.common.close')}</DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
