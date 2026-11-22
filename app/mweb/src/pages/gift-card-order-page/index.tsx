import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CircularProgress, Stack, Typography } from '@mui/material';
import { GIFT_CARD_ORDER_POLL_MS, formatMoney, isGiftCardOrderLive } from '@duncit/utils';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import GiftCardVisual from '../gift-cards-page/GiftCardVisual';
import OrderStatusChip from './OrderStatusChip';
import OrderProgress from './OrderProgress';
import OrderTrackingCard from './OrderTrackingCard';
import { MY_GIFT_CARD_ORDER, type GiftCardOrder } from './queries';

function Line({ label, value, testId, bold = false }: Readonly<{ label: string; value: string; testId: string; bold?: boolean }>) {
  return (
    <Stack data-testid={testId} direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ color: bold ? 'text.primary' : 'text.secondary', fontWeight: bold ? 700 : 500 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * One gift card order — its status, progress, what was paid, and for printed
 * cards the courier and every scan. Re-reads itself while the order is still
 * moving, so a courier update shows without a refresh. Twin of the native
 * GiftCardOrderScreen; the links in the order emails and WhatsApp open here.
 */
export default function GiftCardOrderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderNo = '' } = useParams<{ orderNo: string }>();
  const { data, loading, error, startPolling, stopPolling } = useQuery<{ myGiftCardOrder: GiftCardOrder }>(MY_GIFT_CARD_ORDER, {
    variables: { order_no: orderNo },
    skip: !orderNo,
    fetchPolicy: 'cache-and-network',
  });
  const order = data?.myGiftCardOrder;
  const live = !!order && isGiftCardOrderLive(order);
  // Re-read while the order can still change; an order at rest is left alone.
  useEffect(() => {
    if (live) startPolling(GIFT_CARD_ORDER_POLL_MS);
    else stopPolling();
    return () => stopPolling();
  }, [live, startPolling, stopPolling]);
  const money = (n: number) => formatMoney(n, { symbol: order?.currency_symbol ?? '₹' });

  return (
    <Box data-testid="gift-card-order-screen" sx={{ maxWidth: 560, mx: 'auto', py: 0.5 }}>
      <Stack spacing={2}>
        <PageHeader
          testId="gift-card-order-header"
          title={t('mweb.giftCards.orderTitle', { vars: { order: orderNo } })}
          onBack={() => navigate('/gift-cards?selectedtab=orders')}
          right={order ? <OrderStatusChip order={order} testId="gift-card-order-status" /> : undefined}
        />
        {loading && !order && (
          <Stack sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress size={24} aria-label={t('mweb.a11y.loading')} />
          </Stack>
        )}
        {error && !order && (
          <Alert data-testid="gift-card-order-error" severity="error">
            {t('mweb.giftCards.orderNotFound')}
          </Alert>
        )}
        {order && (
          <>
            <GiftCardVisual
              scopeType="SHOP"
              scopeCategoryId={null}
              scopeName=""
              designName={order.design_name}
              scopeImageUrl={order.design_front_url}
              artworkFrontUrl={order.design_front_url}
              artworkBackUrl={order.design_back_url}
              amount={order.amount}
              currencySymbol={order.currency_symbol}
            />
            <OrderProgress order={order} />
            {live && (
              <Typography data-testid="gift-card-order-live" variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                {t('mweb.giftCards.orderLiveHint')}
              </Typography>
            )}
            <Card sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Line testId="gift-card-order-cards" label={t('mweb.giftCards.totalCards', { vars: { n: order.quantity, amount: money(order.amount) } })} value={money(order.cards_value)} />
                {order.shipping_fee > 0 && <Line testId="gift-card-order-fee" label={t('mweb.giftCards.totalDelivery')} value={money(order.shipping_fee)} />}
                <Line testId="gift-card-order-total" bold label={t('mweb.giftCards.checkoutTotal')} value={money(order.total)} />
                {order.recipient_email && <Line testId="gift-card-order-sent-to" label={t('mweb.giftCards.sentTo')} value={order.recipient_email} />}
              </Stack>
            </Card>
            {order.delivery_mode === 'PHYSICAL' && <OrderTrackingCard order={order} />}
          </>
        )}
      </Stack>
    </Box>
  );
}
