import { Card, Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import type { GiftCardOrder } from './queries';

function Fact({ label, value, testId }: Readonly<{ label: string; value: string; testId: string }>) {
  return (
    <Stack data-testid={testId} direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** A printed order's delivery: where it goes, the courier and tracking number, and every scan — newest first. */
export default function OrderTrackingCard({ order }: Readonly<{ order: GiftCardOrder }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const a = order.shipping_address;
  const s = order.shipment;
  const address = a ? [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '';
  const events = [...order.tracking_events].reverse();

  return (
    <Card data-testid="gift-card-order-tracking" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <Typography sx={{ fontWeight: 700 }}>{t('mweb.giftCards.trackingTitle')}</Typography>
        {a && <Fact testId="gift-card-order-ship-to" label={t('mweb.giftCards.deliverTo')} value={`${a.name} · ${address}`} />}
        {s ? (
          <>
            <Fact testId="gift-card-order-courier" label={t('mweb.giftCards.courier')} value={s.courier_name || '—'} />
            <Fact testId="gift-card-order-awb" label={t('mweb.giftCards.trackingNumber')} value={s.awb || '—'} />
            {s.etd && <Fact testId="gift-card-order-etd" label={t('mweb.giftCards.expectedDelivery')} value={s.etd} />}
          </>
        ) : (
          <Typography data-testid="gift-card-order-not-shipped" variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.giftCards.notShippedYet')}
          </Typography>
        )}
        {events.length > 0 && (
          <>
            <Divider />
            <List dense disablePadding data-testid="gift-card-order-scans">
              {events.map((e) => (
                <ListItem key={`${e.at}-${e.status}`} disableGutters>
                  <ListItemText primary={e.status} secondary={[formatDateTime(e.at), e.location, e.note].filter(Boolean).join(' · ')} />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Stack>
    </Card>
  );
}
