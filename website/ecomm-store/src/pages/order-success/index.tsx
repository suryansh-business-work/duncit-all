import { Link as RouterLink, useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { useCart } from '../../app/providers/CartProvider';
import { ORDER_CONFIRMATION, type StoreOrderConfirmation } from '../../graphql/orders';
import { formatStoreMoney } from '../../lib/money';
import { paths } from '../../lib/paths';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { PAYMENT_KEYS } from '../order-detail/orderLabels';
import { MoneyBreakdown, OrderItems } from '../order-detail/OrderParts';

const HEADLINE_KEYS: Record<StoreOrderConfirmation['status'], string> = {
  PAID: 'ecommStore.success.paid',
  COD_CONFIRMED: 'ecommStore.success.cod',
  PENDING_PAYMENT: 'ecommStore.success.pending',
  FAILED: 'ecommStore.success.failed',
};

/** A guest's way back to the order: the tracking link, and a reason to keep it. */
function GuestTrackCard({ result }: Readonly<{ result: StoreOrderConfirmation }>) {
  const { t } = useStoreT();
  const first = result.orders[0];
  if (!result.access_key || !first) return null;
  return (
    <Alert severity="info" sx={{ borderRadius: `${T.radius.panel}px` }}>
      <Stack spacing={1}>
        <Typography sx={{ fontWeight: 800 }}>{t('ecommStore.success.keepLink')}</Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {result.orders.map((order) => (
            <DuncitButton key={order.id} component={RouterLink} to={paths.guestOrder(order.order_no, result.access_key)} variant="contained">
              {t('ecommStore.success.track', { vars: { orderNo: order.order_no } })}
            </DuncitButton>
          ))}
        </Stack>
      </Stack>
    </Alert>
  );
}

/** /order/success — what was ordered, how it was paid, and where to follow it. */
export function OrderSuccessPage() {
  const { t } = useStoreT();
  const [params] = useSearchParams();
  const { cartToken } = useCart();
  const paymentDocId = params.get('payment') ?? '';
  const key = params.get('key') ?? undefined;
  usePageSeo(t('ecommStore.success.title'));
  const { data, loading, error } = useQuery(ORDER_CONFIRMATION, {
    variables: { payment_doc_id: paymentDocId, cart_token: cartToken, access_key: key },
    skip: !paymentDocId,
  });
  const result = data?.storeOrderConfirmation;
  if (loading && !result) return <Loader label={t('ecommStore.common.loading')} />;
  if (error || !result) return <Alert severity="error">{parseApiError(error, t('ecommStore.success.notFound'))}</Alert>;
  return (
    <Stack spacing={2} sx={{ maxWidth: 820, mx: 'auto' }}>
      <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', bgcolor: T.brandTint, borderRadius: `${T.radius.card}px`, p: 3 }}>
        <CheckCircleRoundedIcon sx={{ fontSize: 64, color: result.status === 'FAILED' ? 'error.main' : 'success.main' }} aria-hidden />
        <Typography variant="h1">{t(HEADLINE_KEYS[result.status])}</Typography>
        <Typography>{t('ecommStore.success.total', { vars: { total: formatStoreMoney(result.total, result.currency_symbol) } })}</Typography>
      </Stack>
      <GuestTrackCard result={result} />
      {result.orders.map((order) => (
        <Paper key={order.id} sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Stack direction="row" useFlexGap sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Typography variant="h3" component="h2">
                {t('ecommStore.order.number', { vars: { orderNo: order.order_no } })}
              </Typography>
              <Typography>{t(PAYMENT_KEYS[order.payment_state])}</Typography>
            </Stack>
            <OrderItems order={order} />
            <MoneyBreakdown order={order} />
          </Stack>
        </Paper>
      ))}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
        {result.access_key ? null : (
          <DuncitButton component={RouterLink} to={paths.orders} variant="outlined">
            {t('ecommStore.account.orders')}
          </DuncitButton>
        )}
        <DuncitButton component={RouterLink} to={paths.shop} variant="contained">
          {t('ecommStore.success.continue')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
