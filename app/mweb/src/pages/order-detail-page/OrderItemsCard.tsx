import { Avatar, Divider, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { OrderDetail } from './queries';

function Row({ label, value, strong, testId }: Readonly<{ label: string; value: string; strong?: boolean; testId: string }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ color: strong ? 'text.primary' : 'text.secondary', fontWeight: strong ? 700 : 400 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 700 : 600, textAlign: 'right', wordBreak: 'break-word' }} data-testid={testId}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * What was bought and what it cost: each line with its picture, quantity and
 * price, then the bill — items, delivery, any discount or coins, the total,
 * and how it was paid. Native twin: components/order-detail/OrderItemsCard.
 */
export default function OrderItemsCard({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTranslation();
  const money = (amount: number) => formatMoney(amount, { symbol: order.currency_symbol });
  const cod = order.payment_method === 'COD';

  return (
    <Stack spacing={1.25} data-testid="order-items">
      <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{t('mweb.orderDetail.items')}</Typography>
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {order.line_items.map((line) => (
          <Stack key={`${line.product_id}-${line.variant_id || 'base'}`} component="li" direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Avatar alt="" src={line.image_url || undefined} variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'action.hover' }} />
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {line.name}
                {line.variant_label ? ` — ${line.variant_label}` : ''}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('mweb.orderDetail.qtyPrice', { vars: { qty: String(line.qty), price: money(line.unit_cost) } })}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{money(line.gross)}</Typography>
          </Stack>
        ))}
      </Stack>
      <Divider />
      <Stack spacing={0.75} data-testid="order-price">
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{t('mweb.orderDetail.priceDetails')}</Typography>
        <Row label={t('mweb.orderDetail.itemsTotal')} value={money(order.items_total)} testId="order-items-total" />
        {order.fulfilment_method === 'SHIP' && (
          <Row label={t('mweb.orderDetail.deliveryCharge')} value={money(order.shipping_charge)} testId="order-delivery-charge" />
        )}
        {order.discount_total > 0 && (
          <Row label={t('mweb.orderDetail.discount')} value={`− ${money(order.discount_total)}`} testId="order-discount" />
        )}
        {order.coins_share > 0 && (
          <Row label={t('mweb.orderDetail.coinsUsed')} value={String(order.coins_share)} testId="order-coins" />
        )}
        <Row label={t('mweb.orderDetail.totalPaid')} value={money(order.total)} strong testId="order-total" />
        <Row
          label={t('mweb.orderDetail.paymentMethod')}
          value={t(cod ? 'mweb.orderDetail.paymentCod' : 'mweb.orderDetail.paymentPrepaid')}
          testId="order-payment-method"
        />
        {order.payment_ref && <Row label={t('mweb.orderDetail.paymentRef')} value={order.payment_ref} testId="order-payment-ref" />}
      </Stack>
    </Stack>
  );
}
