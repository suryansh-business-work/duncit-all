import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardActionArea, CircularProgress, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import OrderStatusChip from '../gift-card-order-page/OrderStatusChip';
import { MY_GIFT_CARD_ORDERS, type GiftCardOrderRow } from '../gift-card-order-page/queries';

/** How many orders the tab lists — a member's gift card history is short. */
const PAGE_SIZE = 50;

function OrderRow({ order }: Readonly<{ order: GiftCardOrderRow }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const delivery = order.delivery_mode === 'PHYSICAL' ? t('mweb.giftCards.deliveryPhysical') : t('mweb.giftCards.deliveryDigital');
  return (
    <Card data-testid={`gift-card-order-${order.order_no}`}>
      <CardActionArea onClick={() => navigate(`/gift-cards/orders/${encodeURIComponent(order.order_no)}`)} sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {order.design_front_url && (
            <Box component="img" src={order.design_front_url} alt="" sx={{ width: 64, aspectRatio: '1.6 / 1', objectFit: 'cover', borderRadius: 1 }} />
          )}
          <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>
              {order.order_no}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {t('mweb.giftCards.orderLine', {
                vars: { n: order.quantity, amount: formatMoney(order.amount, { symbol: order.currency_symbol }), delivery },
              })}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatDateTime(order.created_at)}
            </Typography>
          </Stack>
          <Stack spacing={0.75} sx={{ alignItems: 'flex-end' }}>
            <Typography sx={{ fontWeight: 700 }}>{formatMoney(order.total, { symbol: order.currency_symbol })}</Typography>
            <OrderStatusChip order={order} />
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

/** The member's gift card orders, newest first; each opens its tracking page. */
export default function OrdersTab() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ myGiftCardOrders: { rows: GiftCardOrderRow[]; total: number } }>(MY_GIFT_CARD_ORDERS, {
    variables: { page: 1, page_size: PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.myGiftCardOrders.rows ?? [];

  if (loading && !data) {
    return (
      <Stack data-testid="gift-card-orders-loading" sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label={t('mweb.a11y.loading')} />
      </Stack>
    );
  }
  return (
    <Stack data-testid="gift-card-orders-tab" spacing={1.5}>
      {error && !data && <Alert severity="error">{t('mweb.giftCards.ordersLoadError')}</Alert>}
      {data && rows.length === 0 && (
        <Typography data-testid="gift-card-orders-empty" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          {t('mweb.giftCards.ordersEmpty')}
        </Typography>
      )}
      {rows.map((order) => (
        <OrderRow key={order.id} order={order} />
      ))}
    </Stack>
  );
}
