import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import {
  FOOD_ORDER_STATUS_COLORS,
  FOOD_PAYMENT_STATUS_COLORS,
  canCancelFoodOrder,
  foodItemsSummary,
  foodOrderAdvanceLabel,
  foodOrderMoney,
  foodOrderNextStep,
  foodOrderStatusLabel,
  foodPaymentStatusLabel,
  type FoodOwnerOrder,
  type VenueFoodOrderStatus,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { FoodChip } from './FoodDeskBits';

interface Props {
  order: FoodOwnerOrder;
  /** Resolves once the move is answered — the button spins until then. */
  onAdvance: (order: FoodOwnerOrder, next: VenueFoodOrderStatus) => Promise<void>;
  onView: (order: FoodOwnerOrder) => void;
  onCancel: (order: FoodOwnerOrder) => void;
}

/**
 * One paid order on the board: who ordered what, where they sit, what they
 * paid and how far the kitchen has got — with the next step, the details and
 * cancel-and-refund. The twin of a row of the web board.
 */
export function FoodOrderCard({ order, onAdvance, onView, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const [moving, setMoving] = useState(false);
  const next = foodOrderNextStep(order);
  const no = { vars: { no: order.order_no } };

  const advance = async (step: VenueFoodOrderStatus) => {
    setMoving(true);
    try {
      await onAdvance(order, step);
    } finally {
      setMoving(false);
    }
  };

  return (
    <SurfaceCard testID={`food-order-${order.id}`} gap={8}>
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <Text flex={1} fontSize={15} fontWeight="700" color="$color" numberOfLines={1}>
          {t('venueFoodOwner.orders.orderNo', no)}
        </Text>
        <Text fontSize={15} fontWeight="700" color="$color">
          {foodOrderMoney(order, order.total)}
        </Text>
      </XStack>
      <Text fontSize={12} color="$muted">
        {[fmt.formatDateTime(order.created_at), order.customer_name, order.table_label]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Text fontSize={13} color="$color">
        {foodItemsSummary(t, order)}
      </Text>
      <XStack gap={6} flexWrap="wrap">
        <FoodChip
          label={foodOrderStatusLabel(t, order.status)}
          color={FOOD_ORDER_STATUS_COLORS[order.status]}
        />
        <FoodChip
          label={foodPaymentStatusLabel(t, order.payment_status)}
          color={FOOD_PAYMENT_STATUS_COLORS[order.payment_status]}
        />
      </XStack>
      <XStack gap={8} flexWrap="wrap">
        {next ? (
          <DuncitButton
            testID={`food-order-advance-${order.id}`}
            label={foodOrderAdvanceLabel(t, next)}
            accessibilityLabel={`${foodOrderAdvanceLabel(t, next)} — ${t('venueFoodOwner.orders.orderNo', no)}`}
            size="sm"
            loading={moving}
            disabled={moving}
            onPress={() => fireAndForget(advance(next))}
          />
        ) : null}
        <DuncitButton
          testID={`food-order-view-${order.id}`}
          label={t('venueFoodOwner.orders.view')}
          accessibilityLabel={t('venueFoodOwner.orders.viewOrder', no)}
          size="sm"
          variant="ghost"
          onPress={() => onView(order)}
        />
        {canCancelFoodOrder(order) ? (
          <DuncitButton
            testID={`food-order-cancel-${order.id}`}
            label={t('venueFoodOwner.orders.cancelRefund')}
            accessibilityLabel={t('venueFoodOwner.orders.cancelOrder', no)}
            size="sm"
            variant="ghost"
            tone="danger"
            onPress={() => onCancel(order)}
          />
        ) : null}
      </XStack>
      {order.feedback ? (
        <YStack>
          <Text fontSize={12} color="$muted">
            {t('venueFoodOwner.orders.ratingOutOf', { vars: { rating: order.feedback.rating } })}
          </Text>
        </YStack>
      ) : null}
    </SurfaceCard>
  );
}
