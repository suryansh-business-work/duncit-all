import { YStack } from 'tamagui';
import { canRateFoodOrder, type VenueFoodOrder } from '@duncit/utils';

import { NoticeCard } from '@/components/attendance/NoticeCard';
import { VenuePodsSection } from '@/components/details/VenuePodsSection';
import { useTranslation } from '@/hooks/useTranslation';

import { FoodOrderFeedbackCard } from './FoodOrderFeedbackCard';
import { FoodOrderInvoiceCard } from './FoodOrderInvoiceCard';

interface Props {
  order: VenueFoodOrder;
  /** The key the screen reads the order with — the invoice and the rating use it too. */
  orderKey: string | null;
  /** The payment went through (it may since have been refunded). */
  paid: boolean;
  /** The rating went in: read the order again. */
  onChanged: () => void;
  /** Where the rating form sits in the scroll, for a "rate your order" link to land on. */
  onFeedbackLayout: (y: number) => void;
}

/**
 * What comes after the order itself, in the scroll's own flow: its invoice,
 * its rating, a word on the events opt-in, and what else is on at the venue.
 */
export function FoodOrderFollowUp({
  order,
  orderKey,
  paid,
  onChanged,
  onFeedbackLayout,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const rateable = canRateFoodOrder(order);

  return (
    <>
      {order.invoice_available ? <FoodOrderInvoiceCard order={order} orderKey={orderKey} /> : null}
      {rateable || order.feedback ? (
        <YStack
          onLayout={rateable ? (event) => onFeedbackLayout(event.nativeEvent.layout.y) : undefined}
        >
          <FoodOrderFeedbackCard order={order} orderKey={orderKey} onSubmitted={onChanged} />
        </YStack>
      ) : null}
      {order.subscribe_events && paid ? (
        <NoticeCard
          testID="food-order-subscribed"
          tone="info"
          icon="notifications-active"
          title={t('mweb.venueFood.order.subscribed')}
        />
      ) : null}
      <VenuePodsSection venueId={order.venue_id} title={t('mweb.venueFood.order.events')} />
    </>
  );
}
