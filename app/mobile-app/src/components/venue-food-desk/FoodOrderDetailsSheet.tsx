import { Fragment } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import {
  FOOD_ORDER_STATUS_COLORS,
  FOOD_PAYMENT_STATUS_COLORS,
  foodDietLabel,
  foodOrderMoney,
  foodOrderMoneyLines,
  foodOrderStatusLabel,
  foodPaymentStatusLabel,
  type FoodOwnerOrder,
} from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { RowDivider } from '@/components/club-admin/NavRow';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { FoodChip } from './FoodDeskBits';
import { FoodFeedbackView } from './FoodFeedbackView';

function Line({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack gap={12} justifyContent="space-between">
      <Text fontSize={12} fontWeight="700" color="$muted">
        {label}
      </Text>
      <Text flex={1} textAlign="right" fontSize={13} color="$color">
        {value || '—'}
      </Text>
    </XStack>
  );
}

interface Props {
  /** The order on show; null closes the sheet. */
  order: FoodOwnerOrder | null;
  onClose: () => void;
}

/** One food order in full: the guest, each dish, the note, how the total was reached and the guest's rating. */
export function FoodOrderDetailsSheet({ order, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();

  return (
    <DuncitDialog
      open={order !== null}
      onClose={onClose}
      testID="food-order-details"
      title={
        order ? t('venueFoodOwner.orders.orderNo', { vars: { no: order.order_no } }) : undefined
      }
      closeLabel={t('venueFoodOwner.common.close')}
    >
      {order ? (
        <YStack gap={12}>
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
          <Line
            label={t('venueFoodOwner.orders.colPlaced')}
            value={fmt.formatDateTime(order.created_at)}
          />
          <Line label={t('venueFoodOwner.orders.colGuest')} value={order.customer_name} />
          <Line label={t('venueFoodOwner.orders.colPhone')} value={order.customer_phone} />
          <Line label={t('venueFoodOwner.orders.colTable')} value={order.table_label} />
          <Line label={t('venueFoodOwner.orders.note')} value={order.note} />
          {order.cancel_reason ? (
            <Line label={t('venueFoodOwner.orders.cancelReason')} value={order.cancel_reason} />
          ) : null}
          {order.subscribe_events ? (
            <Line
              label={t('venueFoodOwner.orders.eventUpdates')}
              value={t('venueFoodOwner.orders.subscribedToEvents')}
            />
          ) : null}
          <RowDivider />
          <Text fontSize={14} fontWeight="700" color="$color" role="heading">
            {t('venueFoodOwner.orders.colItems')}
          </Text>
          {order.items.map((line) => (
            <XStack key={line.item_id} gap={8} justifyContent="space-between">
              <YStack flex={1}>
                <Text fontSize={13} color="$color">
                  {t('venueFoodOwner.orders.itemLine', {
                    vars: { qty: line.quantity, name: line.name },
                  })}
                </Text>
                <Text fontSize={11} color="$muted">
                  {foodDietLabel(t, line.diet)}
                  {' · '}
                  {t('venueFoodOwner.orders.unitPrice', {
                    vars: { price: foodOrderMoney(order, line.unit_price) },
                  })}
                </Text>
              </YStack>
              <Text fontSize={13} fontWeight="700" color="$color">
                {foodOrderMoney(order, line.line_total)}
              </Text>
            </XStack>
          ))}
          <RowDivider />
          {foodOrderMoneyLines(t, order).map((line) => (
            <Fragment key={line.key}>
              <Line label={line.label} value={line.value} />
            </Fragment>
          ))}
          {order.feedback ? (
            <>
              <RowDivider />
              <Text fontSize={14} fontWeight="700" color="$color" role="heading">
                {t('venueFoodOwner.orders.feedback')}
              </Text>
              <Text fontSize={11} color="$muted">
                {t('venueFoodOwner.orders.feedbackAt', {
                  vars: { when: fmt.formatDateTime(order.feedback.submitted_at) },
                })}
              </Text>
              <FoodFeedbackView feedback={order.feedback} testID="food-order-feedback" />
            </>
          ) : null}
        </YStack>
      ) : null}
    </DuncitDialog>
  );
}
