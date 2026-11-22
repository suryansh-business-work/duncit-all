import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Grid, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import DetailHeader from '../../../components/detail/DetailHeader';
import DetailPageState, { isNotFoundError } from '../../../components/detail/DetailPageState';
import { useCanWrite } from '../../../lib/roles';
import OrderFactsSection from './detail/OrderFactsSection';
import ShipmentSection from './detail/ShipmentSection';
import OrderHistorySection from './detail/OrderHistorySection';
import OrderActions from './detail/OrderActions';
import OrderAddressForm from './order-address';
import { FulfilmentChip, PaymentChip } from './labels';
import { useOrderActions } from './useOrderActions';
import {
  GIFT_CARD_ORDER_ADMIN,
  type GiftCardAdminOrder,
  type GiftCardOrderHistoryEntry,
} from './queries';

interface Detail {
  giftCardOrderAdmin: { order: GiftCardAdminOrder; history: GiftCardOrderHistoryEntry[] };
}

/**
 * Loyalty > Gift Card Orders > one order — the buyer, what was bought and paid,
 * the delivery address and courier tracking for a printed order, the full audit
 * trail, and the fulfilment step that comes next.
 */
export default function OrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const canWrite = useCanWrite();
  const [addressOpen, setAddressOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery<Detail>(GIFT_CARD_ORDER_ADMIN, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const detail = data?.giftCardOrderAdmin;
  const actions = useOrderActions(id, detail?.order.order_no ?? '', () => refetch());

  return (
    <DetailPageState
      loading={loading && !detail}
      error={error}
      notFound={isNotFoundError(error) || (!loading && !error && !detail)}
      onRetry={() => refetch()}
    >
      {detail && (
        <Stack spacing={2.5}>
          <DetailHeader
            backTo="/gift-cards/orders"
            backLabel={t('loyalty.giftOrders.backToList')}
            title={t('loyalty.giftOrders.orderTitle', { vars: { order: detail.order.order_no } })}
            subtitle={t('loyalty.giftOrders.orderSubtitle')}
            status={
              <Stack direction="row" spacing={1}>
                <PaymentChip status={detail.order.payment_status} t={t} />
                <FulfilmentChip status={detail.order.fulfilment_status} t={t} />
              </Stack>
            }
            actions={
              canWrite ? (
                <OrderActions
                  order={detail.order}
                  busy={actions.busy}
                  onMarkPrinted={actions.markPrinted}
                  onBook={actions.book}
                  onRefresh={actions.refresh}
                  onPrintLabel={actions.printLabel}
                  onDownloadLabel={actions.downloadLabel}
                  onEditAddress={() => {
                    actions.clearAddressError();
                    setAddressOpen(true);
                  }}
                />
              ) : undefined
            }
          />
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={2.5}>
                <OrderFactsSection order={detail.order} />
                {detail.order.delivery_mode === 'PHYSICAL' && <ShipmentSection order={detail.order} />}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <OrderHistorySection history={detail.history} />
            </Grid>
          </Grid>
          <OrderAddressForm
            open={addressOpen}
            address={detail.order.shipping_address}
            busy={actions.savingAddress}
            errorMessage={actions.addressError}
            onCancel={() => setAddressOpen(false)}
            onSubmit={async (values) => {
              if (await actions.updateAddress(values)) setAddressOpen(false);
            }}
          />
        </Stack>
      )}
    </DetailPageState>
  );
}
