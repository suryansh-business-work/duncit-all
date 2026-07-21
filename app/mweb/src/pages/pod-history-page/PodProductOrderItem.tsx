import { Avatar, Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StorefrontIcon from '@mui/icons-material/Storefront';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import OrderTrackingTimeline from './OrderTrackingTimeline';
import {
  buildOrderTimeline,
  formatMoney,
  FULFILMENT_LABEL,
  statusLabel,
  trackingUrl,
  type ProductOrder,
} from './productOrders';

/** One product order: fulfilment/status chips, line items, the ship/pickup
 * tracking block, then the fulfilment timeline. */
export default function PodProductOrderItem({ order }: Readonly<{ order: ProductOrder }>) {
  const isShip = order.fulfilment_method === 'SHIP';
  const track = trackingUrl(order.shiprocket.awb);
  const steps = buildOrderTimeline(order);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
        <Chip
          size="small"
          icon={isShip ? <LocalShippingIcon /> : <StorefrontIcon />}
          label={FULFILMENT_LABEL[order.fulfilment_method]}
        />
        <Chip size="small" color="primary" variant="outlined" label={statusLabel(order.fulfilment_status)} />
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          #{order.order_no}
        </Typography>
      </Stack>

      <Stack spacing={0.75}>
        {order.line_items.map((li) => (
          <Stack
            key={`${li.product_id}-${li.variant_id || 'base'}`}
            direction="row"
            spacing={1}
            alignItems="center"
          >
            <Avatar src={li.image_url || undefined} variant="rounded" sx={{ width: 34, height: 34, bgcolor: 'action.hover' }} />
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
              {li.name}
              {li.variant_label ? ` — ${li.variant_label}` : ''} × {li.qty}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              {formatMoney(order.currency_symbol, li.gross)}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Divider sx={{ my: 1 }} />

      {isShip ? (
        <Stack spacing={0.5} sx={{ mb: 1 }}>
          {order.shiprocket.awb && (
            <Typography variant="caption" color="text.secondary">
              AWB {order.shiprocket.awb}
              {order.shiprocket.courier_name ? ` · ${order.shiprocket.courier_name}` : ''}
            </Typography>
          )}
          <Button
            component="a"
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            href={track || undefined}
            target="_blank"
            rel="noopener"
            disabled={!track}
            sx={{ alignSelf: 'flex-start' }}
          >
            Track shipment
          </Button>
        </Stack>
      ) : (
        <Typography variant="caption" sx={{ mb: 1, display: 'block' }} color="text.secondary">
          Pickup code: <b>{order.pickup_ref || '—'}</b>
          {order.pickup_location_id ? ` · ${order.pickup_location_id}` : ''}
        </Typography>
      )}

      <OrderTrackingTimeline steps={steps} />
    </Box>
  );
}
