import { Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow, StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { foodDietLabel } from '../register-venue-page/sections/food/food-labels';
import {
  FOOD_ORDER_STATUS_COLORS,
  FOOD_PAYMENT_STATUS_COLORS,
  foodMoney,
  foodOrderStatusLabel,
  foodPaymentStatusLabel,
} from './food-order-labels';
import type { FoodOrderRow } from './queries';

interface Props {
  /** The order on show; null closes the dialog. */
  order: FoodOrderRow | null;
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
          <DialogTitle id={TITLE_ID}>{t('partners.foodOrders.orderNo', { vars: { no: order.order_no } })}</DialogTitle>
          <DialogContent dividers data-testid="food-order-details">
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <StatusChip
                  status={order.status}
                  colorMap={FOOD_ORDER_STATUS_COLORS}
                  label={foodOrderStatusLabel(t, order.status)}
                />
                <StatusChip
                  status={order.payment_status}
                  colorMap={FOOD_PAYMENT_STATUS_COLORS}
                  label={foodPaymentStatusLabel(t, order.payment_status)}
                />
              </Stack>
              <Stack spacing={0.75}>
                <Line label={t('partners.foodOrders.colPlaced')} value={formatDateTime(order.created_at)} />
                <Line label={t('partners.foodOrders.colGuest')} value={order.customer_name} />
                <Line label={t('partners.foodOrders.colPhone')} value={order.customer_phone} />
                <Line label={t('partners.foodOrders.colTable')} value={order.table_label} />
                <Line label={t('partners.foodOrders.note')} value={order.note} />
                {order.cancel_reason && <Line label={t('partners.foodOrders.cancelReason')} value={order.cancel_reason} />}
              </Stack>
              <Divider flexItem />
              <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
                {t('partners.foodOrders.colItems')}
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
                      {t('partners.foodOrders.itemLine', { vars: { qty: line.quantity, name: line.name } })}
                      <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                        {' · '}
                        {foodDietLabel(t, line.diet)}
                        {' · '}
                        {t('partners.foodOrders.unitPrice', { vars: { price: foodMoney(order, line.unit_price) } })}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
                      {foodMoney(order, line.line_total)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Divider flexItem />
              <Stack spacing={0.75}>
                <Line label={t('partners.foodOrders.subtotal')} value={foodMoney(order, order.subtotal)} />
                {order.discount_amount > 0 && (
                  <Line
                    label={t('partners.foodOrders.discount', { vars: { pct: order.discount_pct } })}
                    value={t('partners.foodOrders.discountValue', { vars: { amount: foodMoney(order, order.discount_amount) } })}
                  />
                )}
                {order.coupon_code && (
                  <Line
                    label={t('partners.foodOrders.coupon', { vars: { code: order.coupon_code, pct: order.coupon_pct } })}
                    value={t('partners.foodOrders.discountValue', {
                      vars: { amount: foodMoney(order, order.coupon_discount_amount) },
                    })}
                  />
                )}
                <Line label={t('partners.foodOrders.colTotal')} value={foodMoney(order, order.total)} />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
