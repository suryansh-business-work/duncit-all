import { Alert, Link, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { formatMoney } from '@duncit/utils';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { DeletionDetail } from './queries';

/**
 * What deleting it touches right now: running orders (each linked to its
 * order page, where it can be force-cancelled), open returns, and for a brand
 * the products that go with it.
 */
export default function DeletionImpactView({ impact }: Readonly<{ impact: DeletionDetail['impact'] }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const clear = impact.open_orders === 0 && impact.open_returns === 0;
  return (
    <Stack spacing={1.5}>
      <Alert severity={clear ? 'success' : 'warning'}>
        {clear
          ? t('products.deletionRequests.nothingRunning')
          : t('products.deletionRequests.running', {
              vars: { orders: impact.open_orders, returns: impact.open_returns },
            })}
      </Alert>
      {impact.orders.length > 0 && (
        <List dense disablePadding aria-label={t('products.deletionRequests.runningOrders')}>
          {impact.orders.map((o) => (
            <ListItem key={o.id} disableGutters divider>
              <ListItemText
                primary={
                  <Link component={RouterLink} to={`/orders/${o.id}`}>
                    {o.order_no}
                  </Link>
                }
                secondary={t('products.deletionRequests.orderLine', {
                  vars: {
                    status: o.fulfilment_status,
                    method: o.fulfilment_method,
                    when: formatDateTime(o.created_at),
                    units: o.units,
                    total: formatMoney(o.total, { symbol: o.currency_symbol, decimals: 2 }),
                  },
                })}
              />
            </ListItem>
          ))}
        </List>
      )}
      {impact.open_orders > impact.orders.length && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('products.deletionRequests.moreOrders', { vars: { count: impact.open_orders - impact.orders.length } })}
        </Typography>
      )}
      {impact.products.length > 0 && (
        <Typography variant="body2">
          {t('products.deletionRequests.brandProducts', {
            vars: { count: impact.products.length, names: impact.products.map((p) => p.product_name).join(', ') },
          })}
        </Typography>
      )}
    </Stack>
  );
}
