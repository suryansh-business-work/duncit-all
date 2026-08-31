import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import OrderSummaryCard from './OrderSummaryCard';
import OrderFulfilmentPanel from './OrderFulfilmentPanel';
import OrderTrackingTimeline from './OrderTrackingTimeline';
import OrderShipmentDialog from './OrderShipmentDialog';
import { STATUS_COLOR, humaniseStatus } from './constants';
import {
  ADVANCE_PRODUCT_ORDER_STATUS,
  CREATE_PRODUCT_ORDER_SHIPMENT,
  PRODUCT_ORDER,
  REFRESH_PRODUCT_ORDER_TRACKING,
  SET_PRODUCT_ORDER_FULFILMENT_METHOD,
} from './queries';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

export default function ProductOrderDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { formatDateTime } = useDateFormat();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shipmentOpen, setShipmentOpen] = useState(false);

  const { data, loading } = useQuery<any>(PRODUCT_ORDER, {
    variables: { id: orderId },
    fetchPolicy: 'cache-and-network',
  });
  const [advance, advanceState] = useMutation<any>(ADVANCE_PRODUCT_ORDER_STATUS);
  const [setMethod, methodState] = useMutation<any>(SET_PRODUCT_ORDER_FULFILMENT_METHOD);
  const [createShipment, shipmentState] = useMutation<any>(CREATE_PRODUCT_ORDER_SHIPMENT);
  const [refreshTracking, trackingState] = useMutation<any>(REFRESH_PRODUCT_ORDER_TRACKING);

  const order = data?.productOrder;
  const busy =
    advanceState.loading || methodState.loading || shipmentState.loading || trackingState.loading;

  const run = async (label: string, action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      setToast(label);
    } catch (actionError) {
      /* v8 ignore next -- Apollo rejects with an Error; the non-Error fallback is defensive */
      setError(actionError instanceof Error ? actionError.message : t('products.orders.actionFailed'));
    }
  };

  const confirmShipment = async (pickupLocationId: string) => {
    await run('Shipment created', () =>
      createShipment({ variables: { id: orderId, pickup_location: pickupLocationId } }),
    );
    setShipmentOpen(false);
  };

  if (loading && !data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 8
        }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!order) {
    return (
      <Stack spacing={2} sx={{ py: 4 }}>
        <Alert severity="warning">{t('products.orders.notFound')}</Alert>
        <DuncitButton startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')} sx={{ alignSelf: 'flex-start' }}>
          Back to orders
        </DuncitButton>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <DuncitButton startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')} sx={{ alignSelf: 'flex-start' }}>
        Back to orders
      </DuncitButton>

      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <Typography variant="h5" sx={{
          fontWeight: 800
        }}>
          {order.order_no}
        </Typography>
        <StatusChip
          size="medium"
          status={order.fulfilment_status}
          label={humaniseStatus(order.fulfilment_status, t)}
          colorMap={STATUS_COLOR}
        />
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid
          size={{
            xs: 12,
            md: 7
          }}>
          <OrderSummaryCard order={order} podDateTime={formatDateTime(order.pod?.pod_date_time)} />
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 5
          }}>
          <Stack spacing={2.5}>
            <OrderFulfilmentPanel
              order={order}
              busy={busy}
              onSetMethod={(method) =>
                run('Fulfilment method updated', () => setMethod({ variables: { id: orderId, method } }))
              }
              onAdvance={(status, note) =>
                run('Status updated', () =>
                  advance({ variables: { id: orderId, status, note: note || null } }),
                )
              }
              onCreateShipment={() => setShipmentOpen(true)}
              onRefreshTracking={() =>
                run('Tracking synced', () => refreshTracking({ variables: { id: orderId } }))
              }
            />
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    mb: 1.5
                  }}>
                  Tracking
                </Typography>
                <OrderTrackingTimeline events={order.tracking_events} />
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <OrderShipmentDialog
        open={shipmentOpen}
        order={order}
        submitting={shipmentState.loading}
        onClose={() => setShipmentOpen(false)}
        onConfirm={confirmShipment}
      />
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
