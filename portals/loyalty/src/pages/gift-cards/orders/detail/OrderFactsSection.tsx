import { Link as RouterLink } from 'react-router';
import { Alert, Box, Card, CardContent, Link, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import InfoGrid, { type InfoItem } from '../../../../components/detail/InfoGrid';
import { deliveryLabels } from '../labels';
import type { GiftCardAdminOrder } from '../queries';

const money = (order: GiftCardAdminOrder, value: number) =>
  formatMoney(value, { symbol: order.currency_symbol, decimals: 2 });

/** What needs the team, in plain words, above the facts. */
function OrderAlerts({ order }: Readonly<{ order: GiftCardAdminOrder }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      {order.stock_short && <Alert severity="warning">{t('loyalty.giftOrders.stockShortAlert', { vars: { n: order.quantity } })}</Alert>}
      {order.shipment_alert_message && <Alert severity="warning">{order.shipment_alert_message}</Alert>}
      {order.last_error && <Alert severity="error">{t('loyalty.giftOrders.lastErrorAlert', { vars: { reason: order.last_error } })}</Alert>}
      {order.shipment_sandbox && <Alert severity="info">{t('loyalty.giftOrders.sandboxAlert')}</Alert>}
    </Stack>
  );
}

/** One order's buyer, what they bought, what they paid, and where the cards are. */
export default function OrderFactsSection({ order }: Readonly<{ order: GiftCardAdminOrder }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const when = (iso: string | null) => (iso ? formatDateTime(iso) : '—');
  const cardsLink = order.physical_batch_id ? (
    <Link component={RouterLink} to={`/gift-cards/physical/batches/${order.physical_batch_id}`}>
      {t('loyalty.giftOrders.openBatch')}
    </Link>
  ) : (
    t('loyalty.giftOrders.cardsIssued', { vars: { n: order.cards_issued } })
  );
  const items: InfoItem[] = [
    { key: 'buyer', label: t('loyalty.giftOrders.buyer'), value: `${order.buyer_name} · ${order.buyer_email}` },
    { key: 'phone', label: t('shell.common.phone'), value: order.buyer_phone || '—' },
    { key: 'delivery', label: t('loyalty.giftOrders.colDelivery'), value: deliveryLabels(t)[order.delivery_mode] },
    { key: 'design', label: t('loyalty.giftOrders.colDesign'), value: order.design_name || '—' },
    { key: 'quantity', label: t('loyalty.giftOrders.colQuantity'), value: String(order.quantity) },
    { key: 'amount', label: t('loyalty.giftOrders.amountEach'), value: money(order, order.amount) },
    { key: 'shipping', label: t('loyalty.giftOrders.shippingFee'), value: money(order, order.shipping_fee) },
    { key: 'total', label: t('loyalty.giftOrders.colTotal'), value: money(order, order.total) },
    { key: 'cards', label: t('loyalty.giftOrders.cards'), value: cardsLink },
    { key: 'placed', label: t('loyalty.giftOrders.colPlaced'), value: when(order.created_at) },
    { key: 'paid', label: t('loyalty.giftOrders.paidAt'), value: when(order.paid_at) },
    { key: 'printed', label: t('loyalty.giftOrders.printedAt'), value: when(order.printed_at) },
    { key: 'payment', label: t('loyalty.giftOrders.paymentId'), value: order.payment_id },
    { key: 'recipient', label: t('loyalty.giftOrders.recipient'), value: order.recipient_name || order.recipient_email || '—' },
    { key: 'message', label: t('loyalty.giftOrders.message'), value: order.message || '—', wide: true },
  ];
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <OrderAlerts order={order} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            {order.design_front_url && (
              <Box component="img" src={order.design_front_url} alt={order.design_name} sx={{ width: 160, aspectRatio: '1.6 / 1', objectFit: 'cover', borderRadius: 2 }} />
            )}
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t('loyalty.giftOrders.summary', { vars: { n: order.quantity, amount: money(order, order.amount) } })}
            </Typography>
          </Stack>
          <InfoGrid items={items} />
        </Stack>
      </CardContent>
    </Card>
  );
}
