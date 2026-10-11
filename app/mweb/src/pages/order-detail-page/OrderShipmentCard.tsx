import { Stack, Typography } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { DuncitButton } from '@duncit/buttons';
import { shipToLines, trackingUrl } from '@duncit/utils';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import type { OrderDetail } from './queries';

function Fact({ label, value, testId }: Readonly<{ label: string; value: string; testId: string }>) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }} data-testid={testId}>
        {value}
      </Typography>
    </Stack>
  );
}

function Heading({ children }: Readonly<{ children: string }>) {
  return <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{children}</Typography>;
}

/** A collected order: the code to show at the counter, and where. */
function PickupBlock({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} data-testid="order-pickup">
      <Heading>{t('mweb.orderDetail.pickup')}</Heading>
      <Fact label={t('mweb.orderDetail.pickupCode')} value={order.pickup_ref} testId="order-pickup-code" />
      <Fact label={t('mweb.orderDetail.pickupLocation')} value={order.pickup_location_id} testId="order-pickup-location" />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('mweb.orderDetail.pickupHint')}</Typography>
    </Stack>
  );
}

/**
 * How the order reaches the buyer. Shipped: courier, AWB (with copy), the
 * courier's estimate and last status, the public tracking link and the
 * delivery address. Collected: the pickup code and place.
 * Native twin: components/order-detail/OrderShipmentCard.
 */
export default function OrderShipmentCard({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTranslation();
  if (order.fulfilment_method !== 'SHIP') return <PickupBlock order={order} />;

  const sr = order.shiprocket;
  const track = trackingUrl(sr.awb);
  const address = order.shipping_address ? shipToLines(order.shipping_address) : [];
  const copyAwb = async () => {
    try {
      await navigator.clipboard.writeText(sr.awb);
      notifySuccess(t('mweb.orderDetail.awbCopied'));
    } catch {
      // No clipboard access (insecure origin, permission denied): say so — the number stays on screen.
      notifyError(t('mweb.orderDetail.copyFailed'));
    }
  };

  return (
    <Stack spacing={1} data-testid="order-shipment">
      <Heading>{t('mweb.orderDetail.shipment')}</Heading>
      {!sr.awb && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="order-not-shipped">
          {t('mweb.orderDetail.notShippedYet')}
        </Typography>
      )}
      <Fact label={t('mweb.orderDetail.courier')} value={sr.courier_name} testId="order-courier" />
      <Fact label={t('mweb.orderDetail.awb')} value={sr.awb} testId="order-awb" />
      <Fact label={t('mweb.orderDetail.estimatedDelivery')} value={sr.etd} testId="order-etd" />
      <Fact label={t('mweb.orderDetail.courierStatus')} value={sr.tracking_status} testId="order-courier-status" />
      {sr.awb && (
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <DuncitButton size="small" variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={copyAwb} data-testid="order-copy-awb">
            {t('mweb.orderDetail.copyAwb')}
          </DuncitButton>
          <DuncitButton
            component="a"
            size="small"
            variant="outlined"
            startIcon={<OpenInNewRoundedIcon />}
            href={track}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="order-track"
          >
            {t('mweb.orderDetail.trackShipment')}
          </DuncitButton>
        </Stack>
      )}
      {address.length > 0 && (
        <Stack spacing={0.25} sx={{ pt: 1 }} data-testid="order-address">
          <Heading>{t('mweb.orderDetail.deliveryAddress')}</Heading>
          {address.map((line) => (
            <Typography key={line} variant="body2" sx={{ color: 'text.secondary' }}>{line}</Typography>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
