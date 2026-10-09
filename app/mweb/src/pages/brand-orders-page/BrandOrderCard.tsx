import { useNavigate } from 'react-router';
import { Box, CardActionArea, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { formatMoney } from '@duncit/utils';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import BrandOrderStatusChip from './BrandOrderStatusChip';
import type { BrandOrderRow } from './queries';

/** One order on the Brand Orders list: number, buyer, items, total, status and
 * AWB. Tapping it opens the order. Native twin: components/brand-orders/BrandOrderRow. */
export default function BrandOrderCard({ order }: Readonly<{ order: BrandOrderRow }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = order.line_items.reduce((sum, line) => sum + line.qty, 0);
  const awb = order.shiprocket.awb;
  return (
    <Box component="li" sx={{ ...SURFACE_SX, overflow: 'hidden' }}>
      <CardActionArea
        data-testid={`brand-order-${order.id}`}
        aria-label={t('mweb.brandOrders.openOrder', { vars: { no: order.order_no } })}
        onClick={() => navigate(`/products/orders/${order.id}`)}
        sx={{ p: 2 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
              <Typography sx={{ fontWeight: 700 }}>
                {t('mweb.brandOrders.orderNo', { vars: { no: order.order_no } })}
              </Typography>
              <BrandOrderStatusChip status={order.fulfilment_status} testId={`brand-order-status-${order.id}`} />
            </Stack>
            <Typography noWrap variant="body2" sx={{ color: 'text.secondary' }}>
              {order.buyer_name}
              {' · '}
              {t('mweb.brandOrders.itemsCount', { count: items, vars: { count: items } })}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid={`brand-order-awb-${order.id}`}>
              {awb ? t('mweb.brandOrders.awb', { vars: { awb } }) : t('mweb.brandOrders.noAwb')}
            </Typography>
          </Stack>
          <Typography sx={{ fontWeight: 700 }}>{formatMoney(order.total, { symbol: order.currency_symbol })}</Typography>
          <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
        </Stack>
      </CardActionArea>
    </Box>
  );
}
