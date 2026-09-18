import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

import { STORE_ORDER } from '../../graphql/orders';
import { useStoreT } from '../../i18n';
import { OrderDetail } from '../order-detail';
import { AccountLayout } from './AccountLayout';

/** /account/orders/:orderNo — one of the signed-in buyer's orders. */
export function AccountOrderPage() {
  const { t } = useStoreT();
  const { orderNo = '' } = useParams();
  const { data, loading, error } = useQuery(STORE_ORDER, { variables: { order_no: orderNo } });
  const order = data?.storeOrder;
  return (
    <AccountLayout title={t('ecommStore.order.detailTitle')}>
      {loading && !order ? <Loader label={t('ecommStore.common.loading')} /> : null}
      {error ? <Alert severity="error">{parseApiError(error, t('ecommStore.common.loadFailed'))}</Alert> : null}
      {order ? <OrderDetail order={order} canAct /> : null}
    </AccountLayout>
  );
}
