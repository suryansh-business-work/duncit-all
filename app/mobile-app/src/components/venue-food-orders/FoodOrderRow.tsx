import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import {
  FOOD_ORDER_STATUS_COLORS,
  FOOD_ORDER_STATUS_KEYS,
  FOOD_PAYMENT_STATUS_COLORS,
  FOOD_PAYMENT_STATUS_KEYS,
  foodOrderLinesSummary,
  formatFoodMoney,
  type MyVenueFoodOrder,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { FoodChip } from '@/components/venue-food-desk/FoodDeskBits';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  order: MyVenueFoodOrder;
  onOpen: () => void;
}

/**
 * One food order on "Your Food Orders": which order and where, where it has
 * got to (or that its payment is still open), its dishes, when it was placed
 * and what it came to, and the way into its own screen.
 * Tamagui twin of mWeb's food-orders-page/FoodOrderRow.
 */
export function FoodOrderRow({ order, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { primary } = useThemeColors();
  const awaitingPayment = order.payment_status === 'PENDING';
  const label = t('mweb.orderDetail.viewDetails');
  const status = awaitingPayment
    ? { label: t(FOOD_PAYMENT_STATUS_KEYS.PENDING), color: FOOD_PAYMENT_STATUS_COLORS.PENDING }
    : {
        label: t(FOOD_ORDER_STATUS_KEYS[order.status]),
        color: FOOD_ORDER_STATUS_COLORS[order.status],
      };
  const total = formatFoodMoney(order.total, order.currency_symbol);

  return (
    <SurfaceCard testID={`food-orders-row-${order.id}`} gap={6}>
      <XStack alignItems="center" gap={8}>
        <Text role="heading" flex={1} fontSize={15} fontWeight="700" color="$color">
          {t('mweb.venueFood.order.orderNo', { vars: { orderNo: order.order_no } })}
        </Text>
        <FoodChip
          testID={`food-orders-status-${order.id}`}
          label={status.label}
          color={status.color}
        />
      </XStack>
      <Text fontSize={13} color="$muted">
        {order.venue_name}
      </Text>
      <Text fontSize={13} color="$color">
        {foodOrderLinesSummary(t, order.items)}
      </Text>
      <XStack alignItems="center" gap={8} flexWrap="wrap">
        <Text flex={1} fontSize={12} color="$muted">
          {t('mweb.orderDetail.placedOn', { vars: { date: formatDate(order.created_at) } })}
          {' · '}
          {t('mweb.orderDetail.total', { vars: { amount: total } })}
        </Text>
        <DuncitButton
          label={label}
          variant="ghost"
          size="sm"
          iconAfter={<MaterialIcons name="chevron-right" size={18} color={primary} />}
          // Starts with the visible label (WCAG 2.5.3), then says which order.
          accessibilityLabel={t('mweb.orderDetail.openOrder', {
            vars: { orderNo: order.order_no },
          })}
          testID={`food-orders-open-${order.id}`}
          onPress={onOpen}
        />
      </XStack>
    </SurfaceCard>
  );
}
