import { Alert, Link, Stack, Typography } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { shiprocketOrderUrl, trackingUrl } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { BrandOrderDetail } from '../brand-orders-page/queries';

function Fact({ label, value, testId }: Readonly<{ label: string; value: string; testId: string }>) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }} data-testid={testId}>{value}</Typography>
    </Stack>
  );
}

function OutLink({ href, label, testId }: Readonly<{ href: string; label: string; testId: string }>) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" data-testid={testId} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
      {label}
      <OpenInNewRoundedIcon fontSize="inherit" />
    </Link>
  );
}

/**
 * Where the shipment stands: the ShipRocket order and shipment ids, courier,
 * AWB, expected delivery, pickup date and the courier's last status, with the
 * public tracking link and the order in the brand's own ShipRocket account —
 * and, when a booking stopped, why, in plain view. Native twin: BrandOrderShipment.
 */
export default function BrandOrderShipment({ order }: Readonly<{ order: BrandOrderDetail }>) {
  const { t } = useTranslation();
  if (order.fulfilment_method !== 'SHIP') {
    return <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="brand-order-pickup">{t('mweb.brandOrders.pickupOrder')}</Typography>;
  }
  const sr = order.shiprocket;
  const track = trackingUrl(sr.awb);
  const inShiprocket = shiprocketOrderUrl(sr.order_id);
  return (
    <Stack spacing={1} data-testid="brand-order-shipment">
      {order.last_error && (
        <Alert severity="error" data-testid="brand-order-last-error">
          {t('mweb.brandOrders.bookingFailed', { vars: { error: order.last_error } })}
        </Alert>
      )}
      {!sr.order_id && !sr.awb && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="brand-order-not-booked">
          {t('mweb.brandOrders.notBooked')}
        </Typography>
      )}
      <Fact label={t('mweb.brandOrders.shiprocketOrderId')} value={sr.order_id} testId="brand-order-sr-order" />
      <Fact label={t('mweb.brandOrders.shipmentId')} value={sr.shipment_id} testId="brand-order-sr-shipment" />
      <Fact label={t('mweb.brandOrders.awbLabel')} value={sr.awb} testId="brand-order-awb" />
      <Fact label={t('mweb.brandOrders.courier')} value={sr.courier_name} testId="brand-order-courier" />
      <Fact label={t('mweb.brandOrders.etd')} value={sr.etd} testId="brand-order-etd" />
      <Fact label={t('mweb.brandOrders.pickupScheduled')} value={sr.pickup_scheduled_date} testId="brand-order-pickup-date" />
      <Fact label={t('mweb.brandOrders.trackingStatus')} value={sr.tracking_status} testId="brand-order-tracking" />
      {(track || inShiprocket) && (
        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
          {track && <OutLink href={track} label={t('mweb.brandOrders.trackShipment')} testId="brand-order-track" />}
          {inShiprocket && <OutLink href={inShiprocket} label={t('mweb.brandOrders.openInShiprocket')} testId="brand-order-open-shiprocket" />}
        </Stack>
      )}
      {inShiprocket && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('mweb.brandOrders.openInShiprocketHint')}</Typography>
      )}
    </Stack>
  );
}
