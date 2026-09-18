import { useQuery } from '@apollo/client/react';
import { Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';

import type { StoreOrder } from '../../graphql/orders';
import { ORDER_RETURNS } from '../../graphql/returns';
import { useStoreT } from '../../i18n';
import { OrderActions } from './OrderActions';
import { FULFILMENT_KEYS, PAYMENT_KEYS, fulfilmentTone } from './orderLabels';
import { MoneyBreakdown, OrderAddress, OrderItems, StatusTimeline } from './OrderParts';
import { ReturnsList } from './ReturnsList';

interface OrderDetailProps {
  order: StoreOrder;
  /** A guest's key; a signed-in owner needs none. */
  accessKey?: string;
  /** False for a contact lookup: it may read the order but not act on it. */
  canAct: boolean;
}

/** One order as its buyer sees it — shared by the account area and guest tracking. */
export function OrderDetail({ order, accessKey, canAct }: Readonly<OrderDetailProps>) {
  const { t } = useStoreT();
  const { formatDateTime } = useDateFormat();
  const { data } = useQuery(ORDER_RETURNS, { variables: { order_no: order.order_no, access_key: accessKey }, skip: !canAct });
  const returns = data?.storeOrderReturns ?? [];
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Typography variant="h2" component="h2">
              {t('ecommStore.order.number', { vars: { orderNo: order.order_no } })}
            </Typography>
            <Chip color={fulfilmentTone(order.status)} label={t(FULFILMENT_KEYS[order.status])} />
          </Stack>
          <Typography color="text.secondary">
            {t('ecommStore.order.placedOn', { vars: { date: formatDateTime(order.created_at) } })}
          </Typography>
          <Typography>{t('ecommStore.order.payment', { vars: { state: t(PAYMENT_KEYS[order.payment_state]) } })}</Typography>
          {order.cancel_reason ? <Typography color="text.secondary">{t('ecommStore.order.cancelReason', { vars: { reason: order.cancel_reason } })}</Typography> : null}
          {canAct ? <OrderActions order={order} accessKey={accessKey} /> : null}
        </Stack>
      </Paper>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Paper sx={{ p: { xs: 2, md: 3 }, flex: 2, width: '100%' }}>
          <Stack spacing={2} divider={<Divider />}>
            <OrderItems order={order} />
            <MoneyBreakdown order={order} />
          </Stack>
        </Paper>
        <Paper sx={{ p: { xs: 2, md: 3 }, flex: 1, width: '100%' }}>
          <Stack spacing={2} divider={<Divider />}>
            <OrderAddress order={order} />
            <StatusTimeline order={order} />
          </Stack>
        </Paper>
      </Stack>
      {returns.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="h3" component="h2">
            {t('ecommStore.returns.forOrder')}
          </Typography>
          <ReturnsList returns={returns} />
        </Stack>
      ) : null}
    </Stack>
  );
}
