import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { useStoreSession } from '../../app/providers/SessionProvider';
import { STORE_ORDER, type StoreOrder } from '../../graphql/orders';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { OrderDetail } from '../order-detail';
import { TrackOrderForm } from './track-order-form';

/** A guest's order opened with the key their checkout handed back. */
function KeyedOrder({ orderNo, orderKey }: Readonly<{ orderNo: string; orderKey: string }>) {
  const { t } = useStoreT();
  const { data, loading, error } = useQuery(STORE_ORDER, { variables: { order_no: orderNo, access_key: orderKey } });
  if (loading && !data) return <Loader label={t('ecommStore.common.loading')} />;
  if (error || !data) return <Alert severity="error">{parseApiError(error, t('ecommStore.track.notFound'))}</Alert>;
  return <OrderDetail order={data.storeOrder} orderKey={orderKey} canAct />;
}

/** /track — the guest's link (order + key), or a lookup by order number and contact. */
export function TrackPage() {
  const { t } = useStoreT();
  const [params] = useSearchParams();
  const { signedIn } = useStoreSession();
  const [found, setFound] = useState<StoreOrder | null>(null);
  usePageSeo(t('ecommStore.track.title'));
  const orderNo = params.get('order') ?? '';
  const orderKey = params.get('key') ?? '';
  return (
    <Stack spacing={2} sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h1">{t('ecommStore.track.title')}</Typography>
      {orderNo && orderKey ? <KeyedOrder orderNo={orderNo} orderKey={orderKey} /> : null}
      {orderNo && orderKey ? null : (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={1.5}>
            <Typography color="text.secondary">{t('ecommStore.track.intro')}</Typography>
            <TrackOrderForm onFound={setFound} />
          </Stack>
        </Paper>
      )}
      {found ? <OrderDetail order={found} canAct={signedIn} /> : null}
    </Stack>
  );
}
