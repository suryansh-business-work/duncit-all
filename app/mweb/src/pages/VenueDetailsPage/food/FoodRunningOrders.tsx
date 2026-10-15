import { Link as RouterLink } from 'react-router';
import { Link, Stack } from '@mui/material';
import { MY_FOOD_ORDERS_PAGE_SIZE, MY_FOOD_ORDERS_PATH, foodOrderKeyFor } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../theme';
import { useMyFoodOrders } from '../../food-orders-page/useMyFoodOrders';
import { foodOrderPath } from './foodStorage';

/**
 * Every order of the visitor's still running at this venue — each with its own
 * "Track your order" link — and the way to all of their food orders. The
 * server decides what is running and whose it is (the account, or the keys
 * this browser kept), so a second order no longer hides the first. Nothing
 * shows while none is running, or while that cannot be read.
 * Native twin: components/details/venue-food/FoodRunningOrders.
 */
export default function FoodRunningOrders({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { rows, keys } = useMyFoodOrders('CURRENT', MY_FOOD_ORDERS_PAGE_SIZE.current, venueId);
  if (rows.length === 0) return null;

  return (
    <Stack component="nav" spacing={0.75} sx={{ ...SURFACE_SX, p: 1.5 }} aria-label={t('mweb.venueFood.myOrders.current')} data-testid="venue-food-running-orders">
      {rows.map((order) => (
        <Link
          key={order.id}
          component={RouterLink}
          to={foodOrderPath(order.venue_id, order.id, foodOrderKeyFor(keys, order.id))}
          sx={{ fontWeight: 600 }}
          data-testid={`venue-food-track-order-${order.id}`}
        >
          {t('mweb.venueFood.trackOrder', { vars: { orderNo: order.order_no } })}
        </Link>
      ))}
      <Link component={RouterLink} to={MY_FOOD_ORDERS_PATH} variant="body2" data-testid="venue-food-my-orders">
        {t('mweb.venueFood.myOrders.viewAll')}
      </Link>
    </Stack>
  );
}
