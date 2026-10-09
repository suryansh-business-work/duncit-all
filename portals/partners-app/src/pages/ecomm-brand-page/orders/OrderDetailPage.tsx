import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip, BackHeader } from '@duncit/ui';
import { brandOrderActions, fulfilmentLabel, parseApiError, statusLabel } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import OrderActions from './OrderActions';
import { ORDER_STATUS_COLORS, orderTotal } from './order-labels';
import { OrderItems, OrderShipment, OrderShipTo, OrderTimeline } from './OrderDetailSections';
import { BRAND_ORDER, type OrderRow } from './orders.queries';

const ORDERS_PATH = '/ecomm-brand/orders';

// Every action returns the whole order, which Apollo writes over the cached one —
// the page re-renders from the cache, so there is nothing more to do here.
const keepCached = () => undefined;

/**
 * `/ecomm-brand/orders/:orderId` — one order of the partner's brands in full:
 * where it stands, what was bought, where it goes, the courier side with the
 * label / invoice / manifest and the ShipRocket links — with the next step.
 */
export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { data, loading, error, refetch } = useQuery<{ brandProductOrder: OrderRow | null }>(BRAND_ORDER, {
    variables: { id: orderId },
    fetchPolicy: 'cache-and-network',
  });
  const row = data?.brandProductOrder ?? null;
  const back = (
    <BackHeader
      backTo={ORDERS_PATH}
      backAriaLabel={t('partners.orders.back')}
      title={row ? t('partners.orders.detailTitle', { vars: { no: row.order_no } }) : t('partners.orders.title')}
    />
  );

  if (loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 5 }} role="status">
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }
  if (!row) {
    return (
      <Stack spacing={2}>
        {back}
        {error ? (
          <Alert
            severity="error"
            action={
              <DuncitButton color="inherit" size="small" onClick={() => refetch()}>
                {t('shell.common.retry')}
              </DuncitButton>
            }
          >
            {parseApiError(error)}
          </Alert>
        ) : (
          <Alert severity="warning">{t('partners.orders.notFound')}</Alert>
        )}
      </Stack>
    );
  }

  const allowed = brandOrderActions(row);
  return (
    <Stack spacing={2.25} sx={{ width: '100%', maxWidth: 880 }} data-testid="order-detail">
      {back}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack spacing={2.25}>
            <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusChip status={row.fulfilment_status} colorMap={ORDER_STATUS_COLORS} label={statusLabel(row.fulfilment_status, t)} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('partners.orders.detailSubtitle', {
                  vars: { buyer: row.buyer_name, amount: orderTotal(row), method: fulfilmentLabel(row.fulfilment_method, t) },
                })}
              </Typography>
            </Stack>
            <OrderActions row={row} allowed={allowed} onUpdated={keepCached} />
            <Divider />
            <Box sx={{ display: 'grid', gap: 2.25, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Stack spacing={2.25}>
                <OrderShipment row={row} documents={allowed.documents} />
                <OrderShipTo row={row} />
              </Stack>
              <Stack spacing={2.25}>
                <OrderTimeline row={row} />
                <OrderItems row={row} />
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
