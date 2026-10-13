import type { ReactNode } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { FOOD_ORDER_STATUS_KEYS, buildFoodOrderTimeline, type VenueFoodOrder } from '@duncit/utils';
import { useEntityPageMeta } from '../../app/pageMeta';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';
import { venueUrl } from '../../utils/seoUrls';
import OrderDetailTimeline from '../order-detail-page/OrderDetailTimeline';
import VenuePodsSection from '../venues-page/VenuePodsSection';
import { useFoodCheckout } from '../VenueDetailsPage/food/useFoodCheckout';
import FoodOrderFeedbackCard from './FoodOrderFeedbackCard';
import FoodOrderInvoiceCard from './FoodOrderInvoiceCard';
import FoodOrderPaymentCard from './FoodOrderPaymentCard';
import FoodOrderSummary from './FoodOrderSummary';
import { useFoodOrder } from './useFoodOrder';

/** The answers that mean "this link does not open an order" rather than "try again". */
const NO_ORDER_CODES = new Set(['FORBIDDEN', 'NOT_FOUND']);

/**
 * A guest's food order (/venue/:venueId/food-order/:orderId) — public, opened
 * by the access key in the link or remembered on the device. It shows where
 * the kitchen has got to and re-reads on its own; an order whose payment never
 * confirmed can be paid from here. Once paid it also holds the invoice; once
 * served, the rating; and under it all, what else is on at the venue.
 */
export default function VenueFoodOrderPage() {
  const { t } = useTranslation();
  const { venueId = '', orderId = '' } = useParams();
  const [params] = useSearchParams();
  const { order, loading, error, errorCode, clientKey, accessKey, refetch } = useFoodOrder(orderId);
  useEntityPageMeta(order ? t('mweb.venueFood.order.orderNo', { vars: { orderNo: order.order_no } }) : null);

  const reload = () => {
    // A failed reload comes back through `error`, drawn below.
    refetch().catch((reloadError: unknown) => logs.mWeb.warn('venueFood', 'reloadOrder', { error: reloadError, orderId }));
  };
  // Paid, or still unconfirmed: either way the next read is what says so.
  const checkout = useFoodCheckout({ onDone: reload });

  const retry = (target: VenueFoodOrder) =>
    checkout.start({
      venue_id: target.venue_id,
      items: target.items.map((line) => ({ item_id: line.item_id, quantity: line.quantity })),
      customer_name: target.customer_name,
      customer_phone: target.customer_phone,
      table_label: target.table_label || null,
      note: target.note || null,
      // Repeated exactly as it was placed — the coupon and the events tick included.
      ...(target.coupon_code ? { coupon_code: target.coupon_code } : {}),
      ...(target.subscribe_events ? { subscribe_events: true } : {}),
      // The key the order was placed with: the server answers with this same order and its payment.
      client_key: clientKey,
    });

  const menuPath = venueUrl(order?.venue_id ?? venueId);
  const backToMenu = (
    <DuncitButton component={RouterLink} to={menuPath} variant="outlined" fullWidth data-testid="food-order-back-to-menu">
      {t('mweb.venueFood.order.backToMenu')}
    </DuncitButton>
  );

  let body: ReactNode;
  if (loading) {
    body = <Skeleton variant="rounded" height={360} role="progressbar" aria-label={t('mweb.a11y.loading')} data-testid="food-order-loading" />;
  } else if (order) {
    const paid = order.payment_status !== 'PENDING' && order.payment_status !== 'FAILED';
    body = (
      <>
        <Stack spacing={0.5} sx={{ ...SURFACE_SX, p: 2 }} data-testid="food-order-head">
          <Typography component="h2" sx={{ fontSize: '1.125rem', fontWeight: 700 }}>
            {t('mweb.venueFood.order.orderNo', { vars: { orderNo: order.order_no } })}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {order.venue_name}
          </Typography>
          <Typography role="status" aria-live="polite" variant="body2" sx={{ fontWeight: 600 }} data-testid="food-order-status">
            {t('mweb.venueFood.order.statusNow', { vars: { status: t(FOOD_ORDER_STATUS_KEYS[order.status]) } })}
          </Typography>
        </Stack>
        <FoodOrderPaymentCard
          order={order}
          canRetry={!!clientKey}
          retrying={checkout.submitting}
          retryError={checkout.error}
          onRetry={() => retry(order)}
        />
        {paid && (
          <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }}>
            <SectionHeader testId="food-order-progress-header" title={t('mweb.venueFood.order.progress')} />
            <OrderDetailTimeline steps={buildFoodOrderTimeline(order, t)} testId="food-order-timeline" />
          </Stack>
        )}
        {order.status === 'SERVED' && (
          // The message that asks for a rating links here with `feedback=1`.
          <FoodOrderFeedbackCard order={order} accessKey={accessKey} focus={params.get('feedback') === '1'} onRated={reload} />
        )}
        <FoodOrderSummary order={order} />
        {order.invoice_available && <FoodOrderInvoiceCard order={order} accessKey={accessKey} />}
        {paid && order.subscribe_events && (
          <Alert severity="success" data-testid="food-order-subscribed">
            {t('mweb.venueFood.order.subscribed')}
          </Alert>
        )}
        {backToMenu}
        <VenuePodsSection venueId={order.venue_id} title={t('mweb.venueFood.order.events')} />
      </>
    );
  } else if (error && !NO_ORDER_CODES.has(errorCode)) {
    body = (
      <EmptyState
        testId="food-order-load-failed"
        icon={<ErrorOutlineIcon />}
        title={t('mweb.venueFood.order.loadFailed')}
        actionLabel={t('mweb.ordersHistory.retry')}
        onAction={reload}
      />
    );
  } else {
    body = (
      <>
        <EmptyState testId="food-order-missing" icon={<ReceiptIcon />} title={t('mweb.venueFood.order.notFound')} />
        {venueId && backToMenu}
      </>
    );
  }

  return (
    <Stack spacing={2} sx={{ py: 0.5, pb: 4 }} data-testid="food-order-screen">
      <PageHeader testId="food-order-header" title={t('mweb.venueFood.order.title')} />
      {body}
    </Stack>
  );
}
