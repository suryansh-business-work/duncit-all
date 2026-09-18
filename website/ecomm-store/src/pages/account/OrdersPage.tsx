import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';

import { EmptyState } from '../../components/EmptyState';
import { StoreImage } from '../../components/StoreImage';
import { MY_ORDERS, type StoreOrder } from '../../graphql/orders';
import { formatStoreMoney } from '../../lib/money';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import { FULFILMENT_KEYS, fulfilmentTone } from '../order-detail/orderLabels';
import { AccountLayout } from './AccountLayout';

function OrderRow({ order }: Readonly<{ order: StoreOrder }>) {
  const { t } = useStoreT();
  const { formatDate } = useDateFormat();
  const first = order.items[0];
  return (
    <ButtonBase component={RouterLink} to={paths.order(order.order_no)} sx={{ width: '100%', bgcolor: T.surface, borderRadius: `${T.radius.panel}px`, p: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
        <Box sx={{ width: 56, flexShrink: 0 }}>
          <StoreImage src={first?.image_url ?? ''} alt="" width={56} height={56} sx={{ borderRadius: 1 }} />
        </Box>
        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800 }}>{t('ecommStore.order.number', { vars: { orderNo: order.order_no } })}</Typography>
          <Typography variant="body2" color="text.secondary">
            {[formatDate(order.created_at), t('ecommStore.order.itemCount', { count: order.items.length })].join(' · ')}
          </Typography>
        </Stack>
        <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
          <Typography sx={{ fontWeight: 800 }}>{formatStoreMoney(order.total, order.currency_symbol)}</Typography>
          <Chip size="small" color={fulfilmentTone(order.status)} label={t(FULFILMENT_KEYS[order.status])} />
        </Stack>
      </Stack>
    </ButtonBase>
  );
}

/** /account/orders — every store order, newest first. */
export function OrdersPage() {
  const { t } = useStoreT();
  const { data, loading } = useQuery(MY_ORDERS, { fetchPolicy: 'cache-and-network' });
  const orders = data?.storeMyOrders ?? [];
  return (
    <AccountLayout title={t('ecommStore.account.orders')}>
      {loading && orders.length === 0 ? <Loader label={t('ecommStore.common.loading')} /> : null}
      {!loading && orders.length === 0 ? (
        <EmptyState
          icon={<Inventory2OutlinedIcon />}
          title={t('ecommStore.account.noOrders')}
          action={
            <DuncitButton component={RouterLink} to={paths.shop} variant="contained">
              {t('ecommStore.cart.startShopping')}
            </DuncitButton>
          }
        />
      ) : null}
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {orders.map((order) => (
          <Box component="li" key={order.id}>
            <OrderRow order={order} />
          </Box>
        ))}
      </Stack>
    </AccountLayout>
  );
}
