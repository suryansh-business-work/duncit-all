import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CircularProgress, Stack, Typography } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { useTranslation } from '../i18n/useTranslation';
import PodProductOrderItem from './pod-history-page/PodProductOrderItem';
import { MY_PRODUCT_ORDERS, type ProductOrder } from './pod-history-page/productOrders';
import CancelReturnDialog from './orders-history-page/CancelReturnDialog';
import OrderReturnsSection from './orders-history-page/OrderReturnsSection';
import PodShopReturnDialog from './orders-history-page/PodShopReturnDialog';
import { groupReturnsByOrder } from './orders-history-page/podShopReturns';
import {
  MY_POD_SHOP_RETURNS,
  type MyPodShopReturnsData,
  type PodShopReturn,
} from './orders-history-page/podShopReturns.queries';

const NO_RETURNS: readonly PodShopReturn[] = [];

/** My Product Order History — every product order the buyer has placed across
 * all pods (newest first), each in its own card with full fulfilment tracking,
 * its cancellation/refund state, and its returns. Native twin: OrdersHistoryScreen. */
export default function OrdersHistoryPage() {
  const { t } = useTranslation();
  const orders = useQuery<{ myProductOrders: ProductOrder[] }>(MY_PRODUCT_ORDERS, {
    fetchPolicy: 'cache-and-network',
  });
  const returns = useQuery<MyPodShopReturnsData>(MY_POD_SHOP_RETURNS, { fetchPolicy: 'cache-and-network' });
  const [returnOrder, setReturnOrder] = useState<ProductOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PodShopReturn | null>(null);
  const list = orders.data?.myProductOrders ?? [];
  const byOrder = useMemo(() => groupReturnsByOrder(returns.data?.myPodShopReturns ?? []), [returns.data]);

  // A return changes what is still returnable, so both lists reload together.
  // A failed reload lands in each query's `error`, which the page renders.
  const reload = () => {
    Promise.all([orders.refetch(), returns.refetch()]).catch(() => undefined);
  };

  if (orders.loading && list.length === 0)
    return (
      <Stack data-testid="orders-loading" sx={{ alignItems: 'center', p: 6 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Stack>
    );
  if (orders.error && list.length === 0)
    return (
      <Alert
        severity="error"
        data-testid="orders-error"
        action={
          <DuncitButton color="inherit" size="small" data-testid="orders-retry" onClick={reload}>
            {t('mweb.ordersHistory.retry')}
          </DuncitButton>
        }
      >
        {parseApiError(orders.error, t('mweb.ordersHistory.loadFailed'))}
      </Alert>
    );

  return (
    <Stack spacing={2} sx={{ py: 0.5 }} data-testid="orders-history-screen">
      <PageHeader testId="orders-history-header" title={t('mweb.ordersHistory.myProductOrders')} />
      {returns.error && (
        <Alert
          severity="warning"
          data-testid="orders-returns-error"
          action={
            <DuncitButton color="inherit" size="small" data-testid="orders-returns-retry" onClick={reload}>
              {t('mweb.ordersHistory.retry')}
            </DuncitButton>
          }
        >
          {t('mweb.podShopReturns.loadFailed')}
        </Alert>
      )}
      {list.length === 0 ? (
        <EmptyState
          testId="orders-empty"
          icon={<LocalShippingOutlinedIcon />}
          title={t('mweb.ordersHistory.empty')}
        />
      ) : (
        list.map((order) => (
          <Card key={order.id} sx={{ p: 2 }} data-testid={`orders-history-order-${order.id}`}>
            <Stack spacing={1}>
              {order.pod?.pod_title && (
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {order.pod.pod_title}
                </Typography>
              )}
              <PodProductOrderItem order={order} />
              <OrderReturnsSection
                order={order}
                returns={byOrder.get(order.id) ?? NO_RETURNS}
                onReturn={setReturnOrder}
                onCancelReturn={setCancelTarget}
              />
            </Stack>
          </Card>
        ))
      )}
      <PodShopReturnDialog order={returnOrder} onClose={() => setReturnOrder(null)} onRequested={reload} />
      <CancelReturnDialog target={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={reload} />
    </Stack>
  );
}
