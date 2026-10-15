import { Link as RouterLink } from 'react-router';
import { Chip, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { DuncitButton } from '@duncit/buttons';
import {
  FOOD_ORDER_STATUS_COLORS,
  FOOD_ORDER_STATUS_KEYS,
  FOOD_PAYMENT_STATUS_COLORS,
  FOOD_PAYMENT_STATUS_KEYS,
  foodOrderKeyFor,
  foodOrderLinesSummary,
  formatFoodMoney,
  type MyVenueFoodOrder,
  type VenueFoodOrderKey,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';
import { useDateFormat } from '../../utils/dateFormat';
import { foodOrderPath } from '../VenueDetailsPage/food/foodStorage';

interface Props {
  order: MyVenueFoodOrder;
  /** The keys this browser kept — an order it placed opens with its own. */
  keys: ReadonlyArray<VenueFoodOrderKey>;
}

/**
 * One food order on "Your Food Orders": which order and where, where it has
 * got to (or that its payment is still open), its dishes, when it was placed
 * and what it came to, and the way into its own page.
 * Native twin: components/venue-food-orders/FoodOrderRow.
 */
export default function FoodOrderRow({ order, keys }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const awaitingPayment = order.payment_status === 'PENDING';
  const chipLabel = awaitingPayment ? t(FOOD_PAYMENT_STATUS_KEYS.PENDING) : t(FOOD_ORDER_STATUS_KEYS[order.status]);
  const chipColor = awaitingPayment ? FOOD_PAYMENT_STATUS_COLORS.PENDING : FOOD_ORDER_STATUS_COLORS[order.status];
  const orderNo = t('mweb.venueFood.order.orderNo', { vars: { orderNo: order.order_no } });

  return (
    <Stack component="li" spacing={0.75} sx={{ ...SURFACE_SX, p: 1.5 }} data-testid={`food-orders-row-${order.id}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography component="h3" sx={{ flex: 1, minWidth: 0, fontSize: '0.9375rem', fontWeight: 700 }}>
          {orderNo}
        </Typography>
        <Chip size="small" color={chipColor} label={chipLabel} data-testid={`food-orders-status-${order.id}`} />
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {order.venue_name}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {foodOrderLinesSummary(t, order.items)}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        <Typography variant="caption" sx={{ flex: 1, minWidth: 0, color: 'text.secondary' }}>
          {t('mweb.orderDetail.placedOn', { vars: { date: formatDate(order.created_at) } })}
          {' · '}
          {t('mweb.orderDetail.total', { vars: { amount: formatFoodMoney(order.total, order.currency_symbol) } })}
        </Typography>
        <DuncitButton
          component={RouterLink}
          to={foodOrderPath(order.venue_id, order.id, foodOrderKeyFor(keys, order.id))}
          size="small"
          endIcon={<ChevronRightRoundedIcon />}
          aria-label={t('mweb.orderDetail.openOrder', { vars: { orderNo: order.order_no } })}
          data-testid={`food-orders-open-${order.id}`}
        >
          {t('mweb.orderDetail.viewDetails')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
