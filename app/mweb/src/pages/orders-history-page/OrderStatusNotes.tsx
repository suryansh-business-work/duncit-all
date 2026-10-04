import { Alert, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProductOrder } from '../pod-history-page/productOrders';
import { refundCopy } from './podShopReturns';

type OrderFacts = Pick<
  ProductOrder,
  'id' | 'currency_symbol' | 'fulfilment_status' | 'delivered_at' | 'cancelled_at' | 'cancel_reason' | 'refund'
>;

/** The order's settled facts: when it was delivered, or that it was cancelled
 * (why, and where the refund stands). Renders nothing for an order in flight.
 * Native twin: components/orders-history/OrderStatusNotes (rule 27). */
export default function OrderStatusNotes({ order }: Readonly<{ order: OrderFacts }>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const cancelled = !!order.cancelled_at || order.fulfilment_status === 'CANCELLED';

  if (!cancelled) {
    if (!order.delivered_at) return null;
    return (
      <Typography variant="caption" data-testid={`po-delivered-${order.id}`} sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
        {t('mweb.ordersHistory.deliveredOn', { vars: { date: formatDate(order.delivered_at) } })}
      </Typography>
    );
  }

  const money = (amount: number) => formatMoney(amount, { symbol: order.currency_symbol });
  const refundLines = refundCopy(order.refund, money, formatDate);

  return (
    <Alert severity="info" icon={false} sx={{ mb: 1 }} data-testid={`po-cancelled-${order.id}`}>
      <Stack spacing={0.25}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {order.cancelled_at
            ? t('mweb.ordersHistory.cancelledOn', { vars: { date: formatDate(order.cancelled_at) } })
            : t('mweb.ordersHistory.cancelled')}
        </Typography>
        {order.cancel_reason && (
          <Typography variant="caption">
            {t('mweb.ordersHistory.cancelReason', { vars: { reason: order.cancel_reason } })}
          </Typography>
        )}
        {refundLines.map((line, index) => (
          <Typography key={line.key} variant="caption" data-testid={`po-refund-${order.id}-${index}`}>
            {t(line.key, { vars: line.vars })}
          </Typography>
        ))}
      </Stack>
    </Alert>
  );
}
