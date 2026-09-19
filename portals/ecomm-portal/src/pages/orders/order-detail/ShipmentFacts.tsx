import { Alert, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { EM_DASH } from '@duncit/table';
import InfoRows, { type InfoLine } from '../../../components/InfoRows';
import type { StoreAdminOrder } from '../queries';

/** What is known about the shipment: courier, AWB, ETA, pickup and the parcel we declared. */
export default function ShipmentFacts({ detail }: Readonly<{ detail: StoreAdminOrder }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { order, shipment } = detail;
  const { parcel } = shipment;
  const kg = (value: number) => t('ecommPortal.shipping.kg', { vars: { value } });
  const cm = (l: number, b: number, h: number) => t('ecommPortal.shipping.cm', { vars: { l, b, h } });
  const sr = order.shiprocket;
  const parcelSource = parcel.source === 'OVERRIDE' ? t('ecommPortal.shipping.parcelOverride') : t('ecommPortal.shipping.parcelAuto');
  const lines: InfoLine[] = [
    { key: 'courier', label: t('ecommPortal.shipping.courier'), value: sr.courier_name || EM_DASH },
    { key: 'awb', label: t('ecommPortal.orders.awb'), value: sr.awb || EM_DASH },
    { key: 'etd', label: t('ecommPortal.shipping.etdLabel'), value: sr.etd || EM_DASH },
    { key: 'pickup', label: t('ecommPortal.shipping.pickupLabel'), value: sr.pickup_scheduled_date || EM_DASH },
    { key: 'tracking', label: t('ecommPortal.shipping.trackingLabel'), value: sr.tracking_status || EM_DASH },
    { key: 'synced', label: t('ecommPortal.shipping.syncedLabel'), value: sr.last_synced_at ? formatDateTime(sr.last_synced_at) : EM_DASH },
  ];
  const parcelLines: InfoLine[] = [
    { key: 'dims', label: t('ecommPortal.shipping.dimensions'), value: cm(parcel.length_cm, parcel.breadth_cm, parcel.height_cm) },
    { key: 'weight', label: t('ecommPortal.shipping.packedWeight'), value: kg(parcel.weight_kg) },
    { key: 'volumetric', label: t('ecommPortal.shipping.volumetric'), value: kg(parcel.volumetric_weight_kg) },
    { key: 'chargeable', label: t('ecommPortal.shipping.chargeable'), value: kg(parcel.chargeable_weight_kg), bold: true },
  ];
  return (
    <Stack spacing={1.5}>
      <InfoRows lines={lines} />
      <Typography component="h4" variant="subtitle2">
        {shipment.parcel_sent
          ? t('ecommPortal.shipping.parcelSent', { vars: { source: parcelSource } })
          : t('ecommPortal.shipping.parcelToSend', { vars: { source: parcelSource } })}
      </Typography>
      <InfoRows lines={parcelLines} />
      {shipment.packaging_missing.length > 0 && !shipment.parcel_sent ? (
        <Alert severity="warning">
          {t('ecommPortal.shipping.packagingMissing', { vars: { items: shipment.packaging_missing.join(', ') } })}
        </Alert>
      ) : null}
    </Stack>
  );
}
