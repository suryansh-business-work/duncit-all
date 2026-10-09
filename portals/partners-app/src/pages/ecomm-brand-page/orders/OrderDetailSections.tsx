import { Alert, Avatar, Link, List, ListItem, ListItemAvatar, ListItemText, Stack, Step, StepLabel, Stepper, Tooltip, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatDateTime } from '@duncit/app-settings';
import { buildOrderTimeline, formatMoney, shiprocketOrderUrl, trackingUrl } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { DetailSection, Fact } from '../returns/ReturnDetailSections';
import OrderDocuments from './OrderDocuments';
import type { OrderRow } from './orders.queries';

type Props = Readonly<{ row: OrderRow }>;

/** Where the order is on its method's ladder — a stopped order is one step. */
export function OrderTimeline({ row }: Props) {
  const { t } = useTranslation();
  const steps = buildOrderTimeline(row, t);
  const active = steps.findIndex((step) => step.current);
  return (
    <DetailSection title={t('partners.orders.progressHeading')}>
      <Stepper orientation="vertical" activeStep={active} aria-label={t('partners.orders.progressHeading')}>
        {steps.map((step) => (
          <Step key={step.status} completed={step.done}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </DetailSection>
  );
}

export function OrderItems({ row }: Props) {
  const { t } = useTranslation();
  const symbol = row.currency_symbol || undefined;
  return (
    <DetailSection title={t('partners.orders.itemsHeading')}>
      <List dense disablePadding aria-label={t('partners.orders.itemsHeading')}>
        {row.line_items.map((item) => (
          <ListItem key={`${item.product_id}-${item.variant_id}`} disableGutters>
            <ListItemAvatar>
              <Avatar variant="rounded" src={item.image_url || undefined} alt={item.name} />
            </ListItemAvatar>
            <ListItemText
              primary={item.variant_label ? `${item.name} · ${item.variant_label}` : item.name}
              secondary={t('partners.orders.itemQtyPrice', { vars: { qty: item.qty, price: formatMoney(item.unit_cost, { decimals: 2, symbol }) } })}
            />
          </ListItem>
        ))}
      </List>
    </DetailSection>
  );
}

export function OrderShipTo({ row }: Props) {
  const { t } = useTranslation();
  const to = row.shipping_address;
  if (row.fulfilment_method !== 'SHIP' || !to) return null;
  const street = [to.line1, to.line2, to.landmark].filter(Boolean).join(', ');
  const place = [to.city, to.state, to.pincode, to.country].filter(Boolean).join(', ');
  return (
    <DetailSection title={t('partners.orders.shipToHeading')}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {to.name}
      </Typography>
      <Typography variant="body2">{street}</Typography>
      <Typography variant="body2">{place}</Typography>
      <Fact label={t('shell.common.phone')} value={to.phone} />
      <Fact label={t('shell.common.email')} value={to.email} />
    </DetailSection>
  );
}

/** The buyer's tracking page and the order in the ShipRocket panel — each only once it exists. */
function ShipmentLinks({ trackUrl, panelUrl }: Readonly<{ trackUrl: string; panelUrl: string }>) {
  const { t } = useTranslation();
  if (!trackUrl && !panelUrl) return null;
  return (
    <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      {trackUrl && (
        <Link href={trackUrl} target="_blank" rel="noopener noreferrer" variant="body2">
          {t('partners.orders.trackShipment')}
        </Link>
      )}
      {panelUrl && (
        <Tooltip describeChild title={t('partners.orders.openInShiprocketHint')}>
          <Link href={panelUrl} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            {t('partners.orders.openInShiprocket')}
            <OpenInNewIcon fontSize="inherit" aria-hidden />
          </Link>
        </Tooltip>
      )}
    </Stack>
  );
}

/** The courier side: who carries it, the AWB, why a booking stopped, and the papers once there is an AWB. */
export function OrderShipment({ row, documents }: Readonly<{ row: OrderRow; documents: boolean }>) {
  const { t } = useTranslation();
  const { shiprocket } = row;
  if (row.fulfilment_method !== 'SHIP') return null;
  const link = trackingUrl(shiprocket.awb);
  return (
    <DetailSection title={t('partners.orders.shipmentHeading')}>
      {row.last_error && (
        <Alert severity="error" data-testid="order-last-error">
          {t('partners.orders.bookingError', { vars: { error: row.last_error } })}
        </Alert>
      )}
      {!shiprocket.order_id && !row.last_error && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('partners.orders.notBooked')}
        </Typography>
      )}
      <Fact label={t('partners.orders.shiprocketOrderId')} value={shiprocket.order_id} />
      <Fact label={t('partners.orders.shipmentId')} value={shiprocket.shipment_id} />
      <Fact label={t('partners.orders.courier')} value={shiprocket.courier_name} />
      <Fact label={t('partners.orders.colAwb')} value={shiprocket.awb} />
      <Fact label={t('partners.orders.pickupScheduled')} value={shiprocket.pickup_scheduled_date} />
      <Fact label={t('partners.orders.trackingStatus')} value={shiprocket.tracking_status} />
      <Fact label={t('partners.orders.etd')} value={shiprocket.etd} />
      <ShipmentLinks trackUrl={link} panelUrl={shiprocketOrderUrl(shiprocket.order_id)} />
      {documents && <OrderDocuments orderId={row.id} />}
      {row.tracking_events.length > 0 && (
        <List dense disablePadding aria-label={t('partners.orders.scansHeading')}>
          {row.tracking_events.map((scan) => (
            <ListItem key={`${scan.status}-${scan.at}`} disableGutters divider>
              <ListItemText primary={`${scan.status} · ${formatDateTime(scan.at)}`} secondary={scan.location} />
            </ListItem>
          ))}
        </List>
      )}
    </DetailSection>
  );
}
