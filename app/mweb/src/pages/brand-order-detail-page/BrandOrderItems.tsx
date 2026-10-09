import { Avatar, Divider, Stack, Typography } from '@mui/material';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import { formatMoney, shipToLines } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { BrandOrderDetail } from '../brand-orders-page/queries';

/** The order's lines and its total, then where it ships to. Native twin: BrandOrderItems. */
export default function BrandOrderItems({ order }: Readonly<{ order: BrandOrderDetail }>) {
  const { t } = useTranslation();
  const money = (amount: number) => formatMoney(amount, { symbol: order.currency_symbol });
  const to = order.shipping_address;
  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{t('mweb.brandOrders.items')}</Typography>
      {order.line_items.map((line) => (
        <Stack key={`${line.product_id}-${line.variant_id || 'base'}`} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Avatar variant="rounded" src={line.image_url || undefined} alt="" sx={{ width: 36, height: 36 }}>
            <ShoppingBagRoundedIcon fontSize="small" />
          </Avatar>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
            {line.name}
            {line.variant_label ? ` — ${line.variant_label}` : ''} × {line.qty}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(line.gross)}</Typography>
        </Stack>
      ))}
      <Divider />
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 700 }}>{t('mweb.brandOrders.total')}</Typography>
        <Typography sx={{ fontWeight: 700 }} data-testid="brand-order-total">{money(order.total)}</Typography>
      </Stack>
      {order.fulfilment_method === 'SHIP' && (
        <Stack spacing={0.5} data-testid="brand-order-ship-to">
          <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{t('mweb.brandOrders.shipTo')}</Typography>
          {to ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
              {shipToLines(to).join('\n')}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('mweb.brandOrders.noShipTo')}</Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}
