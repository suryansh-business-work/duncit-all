import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { DuncitButton } from '@duncit/buttons';
import { buildOrderTimeline, parseApiError } from '@duncit/utils';
import StudioPageHeader from '../../components/StudioPageHeader';
import { SURFACE_SX } from '../../theme';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import OrderTrackingTimeline from '../pod-history-page/OrderTrackingTimeline';
import BrandOrderStatusChip from '../brand-orders-page/BrandOrderStatusChip';
import { BRAND_PRODUCT_ORDER } from '../brand-orders-page/queries';
import BrandOrderActions from './BrandOrderActions';
import BrandOrderItems from './BrandOrderItems';
import BrandOrderShipment from './BrandOrderShipment';

const SECTION_SX = { ...SURFACE_SX, p: 2 };

/**
 * Brand Orders → one order (/products/orders/:id): its progress, lines, ship-to
 * and shipment, and the actions it allows right now. Native twin: BrandOrderDetailScreen.
 */
export default function BrandOrderDetailPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { id = '' } = useParams();
  const { data, loading, error, refetch } = useQuery(BRAND_PRODUCT_ORDER, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const order = data?.brandProductOrder;

  let body;
  if (loading && !data) {
    body = <Skeleton variant="rounded" height={320} data-testid="brand-order-loading" />;
  } else if (error && !data) {
    body = (
      <Alert
        severity="error"
        data-testid="brand-order-error"
        action={
          <DuncitButton color="inherit" size="small" data-testid="brand-order-retry" onClick={() => refetch().catch(() => undefined)}>
            {t('mweb.brandOrders.retry')}
          </DuncitButton>
        }
      >
        {parseApiError(error, t('mweb.brandOrders.loadFailed'))}
      </Alert>
    );
  } else if (order) {
    body = (
      <>
        <Stack spacing={1} sx={SECTION_SX} data-testid="brand-order-summary">
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography sx={{ fontWeight: 700 }}>{t('mweb.brandOrders.orderNo', { vars: { no: order.order_no } })}</Typography>
            <BrandOrderStatusChip status={order.fulfilment_status} testId="brand-order-status" />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.brandOrders.buyer')}: {order.buyer_name}
            {' · '}
            {t('mweb.brandOrders.placedOn', { vars: { date: formatDateTime(order.created_at) } })}
          </Typography>
          {order.cancelled_at && (
            <Alert severity="info" data-testid="brand-order-cancelled">{t('mweb.brandOrders.cancelled')}</Alert>
          )}
        </Stack>
        <Stack spacing={1.25} sx={SECTION_SX}>
          <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{t('mweb.brandOrders.shipment')}</Typography>
          <BrandOrderShipment order={order} />
          <BrandOrderActions order={order} />
        </Stack>
        <Stack spacing={1.25} sx={SECTION_SX}>
          <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{t('mweb.brandOrders.progress')}</Typography>
          <OrderTrackingTimeline steps={buildOrderTimeline(order, t)} testId="brand-order-timeline" />
        </Stack>
        <Stack sx={SECTION_SX}>
          <BrandOrderItems order={order} />
        </Stack>
      </>
    );
  } else {
    body = <Alert severity="warning" data-testid="brand-order-not-found">{t('mweb.brandOrders.notFound')}</Alert>;
  }

  return (
    <Stack spacing={2} sx={{ p: 2, maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="brand-order-detail-page">
      <StudioPageHeader icon={<ReceiptLongRoundedIcon fontSize="small" />} title={t('mweb.brandOrders.detailTitle')} />
      {body}
    </Stack>
  );
}
