import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import OrderShipmentDocuments from './OrderShipmentDocuments';

interface ShiprocketInfo {
  shipment_id?: string;
  awb?: string;
  courier_name?: string;
  tracking_status?: string;
  last_synced_at?: string | null;
}

/** Where the parcel stands with the courier, in one short block. */
function ShipmentStatus({ shiprocket, pickup }: Readonly<{ shiprocket: ShiprocketInfo; pickup: string }>) {
  const { t } = useTranslation();
  if (!shiprocket.shipment_id) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('products.orders.noShipment')}
      </Typography>
    );
  }
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {shiprocket.awb ? <Chip size="small" label={t('products.orders.awb', { vars: { awb: shiprocket.awb } })} /> : null}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {shiprocket.courier_name || t('products.orders.courierPending')}
        </Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
        {shiprocket.tracking_status || t('products.orders.awaitingScan')}
      </Typography>
      {pickup ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('products.orders.pickupFrom', { vars: { name: pickup } })}
        </Typography>
      ) : null}
    </Box>
  );
}

interface OrderShipmentSectionProps {
  order: { id: string; last_error?: string; pickup_location_id?: string; shiprocket?: ShiprocketInfo | null };
  busy: boolean;
  onCreateShipment: () => void;
  onRefreshTracking: () => void;
}

/**
 * A SHIP order's courier desk: book it (or resume a booking that stopped),
 * pull tracking, and print or save its label, invoice and manifest. The error
 * shown is what the LAST booking attempt said, dated — a reason fixed since
 * (a refused login, say) reads as history.
 */
export default function OrderShipmentSection({ order, busy, onCreateShipment, onRefreshTracking }: Readonly<OrderShipmentSectionProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const shiprocket = order.shiprocket ?? {};
  const booked = Boolean(shiprocket.shipment_id);
  const hasAwb = Boolean(shiprocket.awb);
  const bookLabel = booked ? t('products.orders.retryBooking') : t('products.orders.createShipmentShort');
  const lastError = shiprocket.last_synced_at
    ? t('products.orders.lastAttempt', { vars: { at: formatDateTime(shiprocket.last_synced_at), reason: order.last_error ?? '' } })
    : order.last_error;
  return (
    <Stack spacing={1.5}>
      {order.last_error ? <Alert severity="error">{lastError}</Alert> : null}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {hasAwb ? null : (
          <DuncitButton size="small" variant="outlined" startIcon={<LocalShippingIcon />} disabled={busy} onClick={onCreateShipment}>
            {bookLabel}
          </DuncitButton>
        )}
        <DuncitButton size="small" startIcon={<SyncIcon />} disabled={busy || !booked} onClick={onRefreshTracking}>
          {t('products.orders.syncTracking')}
        </DuncitButton>
      </Stack>
      <ShipmentStatus shiprocket={shiprocket} pickup={order.pickup_location_id ?? ''} />
      {booked ? <OrderShipmentDocuments orderId={order.id} hasAwb={hasAwb} /> : null}
    </Stack>
  );
}
