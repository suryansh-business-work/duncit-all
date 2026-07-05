import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OrderSummaryCard from './OrderSummaryCard';
import OrderFulfilmentPanel from './OrderFulfilmentPanel';
import OrderTrackingTimeline from './OrderTrackingTimeline';
import OrderShipmentDialog from './OrderShipmentDialog';
import { STATUS_COLOR, humaniseStatus, type FulfilmentStatus } from './constants';
import {
  ADVANCE_PRODUCT_ORDER_STATUS,
  CREATE_PRODUCT_ORDER_SHIPMENT,
  PRODUCT_ORDER,
  REFRESH_PRODUCT_ORDER_TRACKING,
  SET_PRODUCT_ORDER_FULFILMENT_METHOD,
} from './queries';
import { useDateFormat } from '../../utils/dateFormat';

export default function ProductOrderDetailPage() {
  const navigate = useNavigate();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { formatDateTime } = useDateFormat();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shipmentOpen, setShipmentOpen] = useState(false);

  const { data, loading } = useQuery(PRODUCT_ORDER, {
    variables: { id: orderId },
    fetchPolicy: 'cache-and-network',
  });
  const [advance, advanceState] = useMutation(ADVANCE_PRODUCT_ORDER_STATUS);
  const [setMethod, methodState] = useMutation(SET_PRODUCT_ORDER_FULFILMENT_METHOD);
  const [createShipment, shipmentState] = useMutation(CREATE_PRODUCT_ORDER_SHIPMENT);
  const [refreshTracking, trackingState] = useMutation(REFRESH_PRODUCT_ORDER_TRACKING);

  const order = data?.productOrder;
  const busy =
    advanceState.loading || methodState.loading || shipmentState.loading || trackingState.loading;

  const run = async (label: string, action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      setToast(label);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Action failed');
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
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!order) {
    return (
      <Stack spacing={2} sx={{ py: 4 }}>
        <Alert severity="warning">Order not found.</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')} sx={{ alignSelf: 'flex-start' }}>
          Back to orders
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')} sx={{ alignSelf: 'flex-start' }}>
        Back to orders
      </Button>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Typography variant="h5" fontWeight={800}>
          {order.order_no}
        </Typography>
        <Chip
          label={humaniseStatus(order.fulfilment_status)}
          color={STATUS_COLOR[order.fulfilment_status as FulfilmentStatus] ?? 'default'}
        />
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <OrderSummaryCard order={order} podDateTime={formatDateTime(order.pod?.pod_date_time)} />
        </Grid>
        <Grid item xs={12} md={5}>
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
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
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
