import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Grid, Stack } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { OrderStatusChip, PaymentMethodChip } from '../../../components/chips';
import { STORE_ADMIN_ORDER, type StoreAdminOrder } from '../queries';
import OrderActionsCard from './OrderActionsCard';
import OrderCustomerCard from './OrderCustomerCard';
import OrderItemsCard from './OrderItemsCard';
import OrderMoneyCard from './OrderMoneyCard';
import OrderNotesCard from './OrderNotesCard';
import OrderReturnsCard from './OrderReturnsCard';
import OrderTimelineCard from './OrderTimelineCard';
import { useOrderActions } from './useOrderActions';

/** The page once the order has loaded: what was bought and its money on the left, what to do on the right. */
function OrderDetail({ detail }: Readonly<{ detail: StoreAdminOrder }>) {
  const actions = useOrderActions(detail.order.id);
  const { order } = detail;
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Stack spacing={3}>
          <OrderItemsCard order={order} />
          <OrderMoneyCard order={order} payment={detail.payment} />
          <OrderTimelineCard order={order} />
          <OrderNotesCard order={order} actions={actions} />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Stack spacing={3}>
          <OrderActionsCard detail={detail} actions={actions} />
          <OrderCustomerCard detail={detail} />
          <OrderReturnsCard orderId={order.id} symbol={order.currency_symbol} />
        </Stack>
      </Grid>
    </Grid>
  );
}

/** One pet-store order (`/orders/:id`). */
export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { id = '' } = useParams<{ id: string }>();
  const { data, loading, error } = useQuery(STORE_ADMIN_ORDER, { variables: { id }, fetchPolicy: 'cache-and-network' });
  const detail = data?.storeAdminOrder;
  const header = detail ? (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <OrderStatusChip status={detail.order.fulfilment_status} />
      <PaymentMethodChip method={detail.order.payment_method} />
    </Stack>
  ) : undefined;
  return (
    <Stack spacing={3}>
      <BackHeader
        title={detail?.order.order_no ?? t('shell.common.order')}
        eyebrow={detail ? t('ecommPortal.orders.placedOn', { vars: { date: formatDateTime(detail.order.created_at) } }) : undefined}
        backTo="/orders"
        backAriaLabel={t('ecommPortal.common.backTo', { vars: { name: t('ecommPortal.nav.orders') } })}
        actions={header}
      />
      <QueryGuard loading={loading && !detail} error={error} notFound={!loading && !detail} notFoundText={t('ecommPortal.common.notFound')}>
        {() => detail && <OrderDetail detail={detail} />}
      </QueryGuard>
    </Stack>
  );
}
