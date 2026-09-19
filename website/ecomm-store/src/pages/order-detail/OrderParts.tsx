import { Box, Divider, Link, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';

import { StoreImage } from '../../components/StoreImage';
import type { StoreOrder } from '../../graphql/orders';
import { formatStoreMoney } from '../../lib/money';
import { useStoreT } from '../../i18n';

/** The courier's events, newest last, as a vertical timeline. */
export function StatusTimeline({ order }: Readonly<{ order: StoreOrder }>) {
  const { t } = useStoreT();
  const { formatDateTime } = useDateFormat();
  if (order.events.length === 0) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="h4" component="h3">
        {t('ecommStore.order.timeline')}
      </Typography>
      <Stepper orientation="vertical" activeStep={order.events.length - 1}>
        {order.events.map((event) => (
          <Step key={`${event.at}:${event.status}`} completed>
            <StepLabel
              optional={
                <Typography variant="caption" color="text.secondary">
                  {[formatDateTime(event.at), event.location, event.note].filter(Boolean).join(' · ')}
                </Typography>
              }
            >
              {event.status}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      {order.etd && !order.delivered_at ? (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t('ecommStore.order.eta', { vars: { etd: order.etd } })}
        </Typography>
      ) : null}
      {order.awb ? (
        <Typography variant="body2">
          {t('ecommStore.order.awb', { vars: { courier: order.courier_name, awb: order.awb } })}{' '}
          {order.tracking_url ? (
            <Link href={order.tracking_url} target="_blank" rel="noopener noreferrer">
              {t('ecommStore.order.trackCourier')}
            </Link>
          ) : null}
        </Typography>
      ) : null}
    </Stack>
  );
}

/** What was bought, with any quantity already on a return. */
export function OrderItems({ order }: Readonly<{ order: StoreOrder }>) {
  const { t } = useStoreT();
  return (
    <Stack component="ul" spacing={1.25} sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {order.items.map((item) => (
        <Stack component="li" key={`${item.product_id}:${item.variant_id}`} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 56, flexShrink: 0 }}>
            <StoreImage src={item.image_url} alt={item.name} width={56} height={56} sx={{ borderRadius: 1 }} />
          </Box>
          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {[item.variant_label, t('ecommStore.order.qty', { vars: { qty: item.qty } })].filter(Boolean).join(' · ')}
            </Typography>
            {item.returned_qty > 0 ? (
              <Typography variant="caption">{t('ecommStore.order.returnedQty', { vars: { qty: item.returned_qty } })}</Typography>
            ) : null}
          </Stack>
          <Typography sx={{ fontWeight: 700 }}>{formatStoreMoney(item.line_total, order.currency_symbol)}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function MoneyRow({ label, value, strong = false }: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography sx={{ fontWeight: strong ? 800 : 400 }}>{label}</Typography>
      <Typography sx={{ fontWeight: strong ? 800 : 600 }}>{value}</Typography>
    </Stack>
  );
}

/** Items, shipping, discount, and what was paid or is due on delivery. */
export function MoneyBreakdown({ order }: Readonly<{ order: StoreOrder }>) {
  const { t } = useStoreT();
  const fmt = (value: number) => formatStoreMoney(value, order.currency_symbol);
  const cod = order.payment_method === 'COD';
  return (
    <Stack spacing={0.75}>
      <MoneyRow label={t('ecommStore.order.itemsTotal')} value={fmt(order.items_total)} />
      <MoneyRow label={t('ecommStore.order.shipping')} value={fmt(order.shipping_charge)} />
      {order.discount_total > 0 ? <MoneyRow label={t('ecommStore.order.discount')} value={`-${fmt(order.discount_total)}`} /> : null}
      <Divider />
      <MoneyRow label={cod ? t('ecommStore.order.codDue') : t('ecommStore.order.amountPaid')} value={fmt(cod ? order.cod_amount : order.amount_paid)} strong />
    </Stack>
  );
}

/** The delivery address block. */
export function OrderAddress({ order }: Readonly<{ order: StoreOrder }>) {
  const { t } = useStoreT();
  const a = order.shipping_address;
  if (!a) return null;
  return (
    <Stack>
      <Typography variant="h4" component="h3">
        {t('ecommStore.order.deliverTo')}
      </Typography>
      <Typography sx={{ fontWeight: 700 }}>{a.name}</Typography>
      <Typography variant="body2">{[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}</Typography>
      <Typography variant="body2">{[a.city, a.state, a.pincode].filter(Boolean).join(', ')}</Typography>
      <Typography variant="body2">{a.phone}</Typography>
    </Stack>
  );
}
