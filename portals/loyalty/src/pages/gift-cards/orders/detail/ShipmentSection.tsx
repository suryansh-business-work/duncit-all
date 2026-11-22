import { Card, CardContent, Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import InfoGrid, { type InfoItem } from '../../../../components/detail/InfoGrid';
import type { GiftCardAdminOrder } from '../queries';

/** One line of an address, skipping the parts that were left empty. */
const addressLine = (a: NonNullable<GiftCardAdminOrder['shipping_address']>) =>
  [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode, a.country].filter(Boolean).join(', ');

/** Where a printed order goes, who carries it, and every scan the courier reported — newest first. */
export default function ShipmentSection({ order }: Readonly<{ order: GiftCardAdminOrder }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const s = order.shipment;
  const a = order.shipping_address;
  const items: InfoItem[] = [
    { key: 'shipTo', label: t('loyalty.giftOrders.shipTo'), value: a ? `${a.name} · ${a.phone}` : '—' },
    { key: 'address', label: t('loyalty.giftOrders.address'), value: a ? addressLine(a) : '—', wide: true },
    { key: 'courier', label: t('loyalty.giftOrders.courier'), value: s?.courier_name || '—' },
    { key: 'awb', label: t('loyalty.giftOrders.colAwb'), value: s?.awb || '—' },
    { key: 'etd', label: t('loyalty.giftOrders.etd'), value: s?.etd || '—' },
    { key: 'pickup', label: t('loyalty.giftOrders.pickupDate'), value: s?.pickup_scheduled_date || '—' },
    { key: 'courierStatus', label: t('loyalty.giftOrders.courierStatus'), value: s?.tracking_status || '—' },
    { key: 'synced', label: t('loyalty.giftOrders.lastSynced'), value: s?.last_synced_at ? formatDateTime(s.last_synced_at) : '—' },
  ];
  const events = [...order.tracking_events].reverse();
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t('loyalty.giftOrders.shipmentTitle')}
          </Typography>
          <InfoGrid items={items} />
          <Divider />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t('loyalty.giftOrders.trackingTitle')}
          </Typography>
          {events.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('loyalty.giftOrders.trackingEmpty')}
            </Typography>
          ) : (
            <List dense disablePadding data-testid="gift-order-tracking">
              {events.map((e) => (
                <ListItem key={`${e.at}-${e.status}`} disableGutters>
                  <ListItemText
                    primary={e.status}
                    secondary={[formatDateTime(e.at), e.location, e.note].filter(Boolean).join(' · ')}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
