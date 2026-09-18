import { Link, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import { statusLabel, trackingUrl } from '@duncit/utils';
import EventTimeline from '../../../components/EventTimeline';
import InfoRows from '../../../components/InfoRows';
import type { StoreOrder } from '../queries';

/** The parcel: its courier and AWB, then every tracking scan, newest first. */
export default function OrderTimelineCard({ order }: Readonly<{ order: StoreOrder }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { shiprocket } = order;
  const events = [...order.tracking_events].reverse().map((event) => ({
    key: event.status + '@' + event.at,
    title: statusLabel(event.status, t),
    note: event.note,
    meta: [event.location, formatDateTime(event.at)].filter(Boolean).join(' · '),
  }));
  return (
    <SectionCard title={t('ecommPortal.orders.tracking')}>
      {shiprocket.awb ? (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <InfoRows
            lines={[
              { key: 'awb', label: t('ecommPortal.orders.awb'), value: shiprocket.awb },
              { key: 'courier', label: t('ecommPortal.orders.courier'), value: shiprocket.courier_name || t('ecommPortal.orders.courierPending') },
              { key: 'status', label: t('ecommPortal.orders.courierStatus'), value: shiprocket.tracking_status || t('ecommPortal.orders.awaitingScan') },
            ]}
          />
          <Stack direction="row" spacing={2}>
            <Link href={trackingUrl(shiprocket.awb)} target="_blank" rel="noopener noreferrer" variant="body2">
              {t('ecommPortal.orders.trackParcel')}
            </Link>
            {shiprocket.label_url && (
              <Link href={shiprocket.label_url} target="_blank" rel="noopener noreferrer" variant="body2">
                {t('ecommPortal.orders.downloadLabel')}
              </Link>
            )}
          </Stack>
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t('ecommPortal.orders.noShipment')}
        </Typography>
      )}
      {events.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('fulfilment.noTrackingUpdates')}
        </Typography>
      )}
      <EventTimeline events={events} ariaLabel={t('ecommPortal.orders.trackingEvents')} />
    </SectionCard>
  );
}
