import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { DuncitButton } from '@duncit/buttons';
import { buildDetailedOrderTimeline, fulfilmentLabel, groupReturnsByOrder, parseApiError } from '@duncit/utils';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import { SURFACE_SX } from '../../theme';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import BrandOrderStatusChip from '../brand-orders-page/BrandOrderStatusChip';
import CancelReturnDialog from '../orders-history-page/CancelReturnDialog';
import OrderReturnsSection from '../orders-history-page/OrderReturnsSection';
import OrderStatusNotes from '../orders-history-page/OrderStatusNotes';
import PodShopReturnDialog from '../orders-history-page/PodShopReturnDialog';
import {
  MY_POD_SHOP_RETURNS,
  type MyPodShopReturnsData,
  type PodShopReturn,
} from '../orders-history-page/podShopReturns.queries';
import OrderActionsCard from './OrderActionsCard';
import OrderDetailTimeline from './OrderDetailTimeline';
import OrderItemsCard from './OrderItemsCard';
import OrderShipmentCard from './OrderShipmentCard';
import { MY_PRODUCT_ORDER, type OrderDetail } from './queries';

const SECTION_SX = { ...SURFACE_SX, p: 2 };
const NO_RETURNS: readonly PodShopReturn[] = [];

/**
 * My Product Orders → one order (/orders/:orderId): where it is and every scan
 * that got it there, how it reaches the buyer, what was bought and paid, its
 * cancellation / refund and returns, the invoices and a way to ask for help.
 * Native twin: OrderDetailScreen.
 */
export default function OrderDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const { orderId = '' } = useParams();
  const { data, loading, error, refetch } = useQuery(MY_PRODUCT_ORDER, {
    variables: { id: orderId },
    fetchPolicy: 'cache-and-network',
  });
  const returns = useQuery<MyPodShopReturnsData>(MY_POD_SHOP_RETURNS, { fetchPolicy: 'cache-and-network' });
  const [returnOrder, setReturnOrder] = useState<OrderDetail | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PodShopReturn | null>(null);
  const order = data?.myProductOrder;
  const byOrder = useMemo(() => groupReturnsByOrder(returns.data?.myPodShopReturns ?? []), [returns.data]);
  const toOrders = () => navigate('/orders');

  // A return changes what is still returnable, so the order and its returns
  // reload together. A failed reload lands in each query's `error`, rendered below.
  const reload = () => {
    Promise.all([refetch(), returns.refetch()]).catch(() => undefined);
  };

  let body;
  if (loading && !data) {
    body = <Skeleton variant="rounded" height={420} data-testid="order-detail-loading" aria-label={t('mweb.a11y.loading')} />;
  } else if (error && !data) {
    body = (
      <Alert
        severity="error"
        data-testid="order-detail-error"
        action={
          <DuncitButton color="inherit" size="small" data-testid="order-detail-retry" onClick={reload}>
            {t('mweb.ordersHistory.retry')}
          </DuncitButton>
        }
      >
        {parseApiError(error, t('mweb.orderDetail.loadFailed'))}
      </Alert>
    );
  } else if (order) {
    body = (
      <>
        <Stack spacing={1} sx={SECTION_SX} data-testid="order-summary">
          {order.pod?.pod_title && (
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {order.pod.pod_title}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography component="h2" sx={{ fontWeight: 700, wordBreak: 'break-word' }} data-testid="order-number">
              {t('mweb.orderDetail.orderNo', { vars: { orderNo: order.order_no } })}
            </Typography>
            <BrandOrderStatusChip status={order.fulfilment_status} testId="order-status" />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="order-placed">
            {t('mweb.orderDetail.placedOn', { vars: { date: formatDateTime(order.created_at) } })}
            {' · '}
            {fulfilmentLabel(order.fulfilment_method, t)}
          </Typography>
          <OrderStatusNotes order={order} />
        </Stack>
        <Stack spacing={1.25} sx={SECTION_SX}>
          <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{t('mweb.orderDetail.tracking')}</Typography>
          <OrderDetailTimeline steps={buildDetailedOrderTimeline(order, t)} testId="order-timeline" />
        </Stack>
        <Stack sx={SECTION_SX}>
          <OrderShipmentCard order={order} />
        </Stack>
        <Stack sx={SECTION_SX}>
          <OrderItemsCard order={order} />
        </Stack>
        {returns.error && (
          <Alert severity="warning" data-testid="order-returns-error">{t('mweb.podShopReturns.loadFailed')}</Alert>
        )}
        <OrderReturnsSection
          order={order}
          returns={byOrder.get(order.id) ?? NO_RETURNS}
          onReturn={() => setReturnOrder(order)}
          onCancelReturn={setCancelTarget}
        />
        <Stack sx={SECTION_SX}>
          <OrderActionsCard order={order} />
        </Stack>
      </>
    );
  } else {
    body = (
      <Stack spacing={1} data-testid="order-detail-not-found">
        <EmptyState
          testId="order-detail-empty"
          icon={<ReceiptLongOutlinedIcon />}
          title={t('mweb.orderDetail.notFoundTitle')}
          actionLabel={t('mweb.orderDetail.backToOrders')}
          onAction={toOrders}
        />
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          {t('mweb.orderDetail.notFoundBody')}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ py: 0.5 }} data-testid="order-detail-page">
      <PageHeader testId="order-detail-header" title={t('mweb.orderDetail.title')} onBack={toOrders} />
      {body}
      <PodShopReturnDialog order={returnOrder} onClose={() => setReturnOrder(null)} onRequested={reload} />
      <CancelReturnDialog target={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={reload} />
    </Stack>
  );
}
