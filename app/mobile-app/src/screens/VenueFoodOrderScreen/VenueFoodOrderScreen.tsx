import { useRef, type ReactNode } from 'react';
import type { ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';
import { FOOD_ORDER_STATUS_KEYS, buildFoodOrderTimeline, type VenueFoodOrder } from '@duncit/utils';

import { RazorpayWebView } from '@/components/checkout/RazorpayWebView';
import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import { OrderDetailTimeline } from '@/components/order-detail/OrderDetailTimeline';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { SectionHeader } from '@/components/SectionHeader';
import { useLoadingRegion } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useFoodCheckout } from '@/hooks/useFoodCheckout';
import { useFoodOrder } from '@/hooks/useFoodOrder';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

import { FoodOrderFollowUp } from './FoodOrderFollowUp';
import { FoodOrderPaymentCard } from './FoodOrderPaymentCard';
import { FoodOrderSummary } from './FoodOrderSummary';

/** The answers that mean "this link does not open an order" rather than "try again". */
const NO_ORDER_CODES = new Set(['FORBIDDEN', 'NOT_FOUND']);

/**
 * A member's food order (mWeb /venue/:venueId/food-order/:orderId) — opened by
 * the access key in the link or remembered on the device. It shows where the
 * kitchen has got to and re-reads on its own; an order whose payment never
 * confirmed can be paid from here. RN twin of mWeb's venue-food-order-page.
 */
export function VenueFoodOrderScreen() {
  const { t } = useTranslation();
  const loadingRegion = useLoadingRegion();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'VenueFoodOrder'>>();
  const venueId = route.params?.venueId ?? '';
  const orderId = route.params?.orderId ?? '';
  const { order, loading, error, errorCode, clientKey, accessKey, refetch } = useFoodOrder(
    orderId,
    route.params?.key ?? null,
  );

  // A failed reload comes back through `error`, drawn below.
  const reload = () => fireAndForget(refetch());
  // Paid, or still unconfirmed: either way the next read is what says so.
  const checkout = useFoodCheckout({ onDone: reload });

  const retry = (target: VenueFoodOrder) =>
    fireAndForget(
      checkout.start({
        venue_id: target.venue_id,
        items: target.items.map((line) => ({ item_id: line.item_id, quantity: line.quantity })),
        customer_name: target.customer_name,
        customer_phone: target.customer_phone,
        table_label: target.table_label || null,
        note: target.note || null,
        // Repeated exactly as it was placed — the coupon and the events opt-in included.
        ...(target.coupon_code ? { coupon_code: target.coupon_code } : {}),
        ...(target.subscribe_events ? { subscribe_events: true } : {}),
        // The key the order was placed with: the server answers with this same order and its payment.
        client_key: clientKey,
      }),
    );

  // The "rate your order" link (`?feedback=1`) lands on the rating form, once, when it is drawn.
  const scroll = useRef<ScrollView>(null);
  const landOnFeedback = useRef(!!route.params?.feedback);
  const onFeedbackLayout = (y: number) => {
    if (!landOnFeedback.current) return;
    landOnFeedback.current = false;
    scroll.current?.scrollTo({ y, animated: true });
  };

  const menuVenueId = order?.venue_id ?? venueId;
  const backToMenu = menuVenueId ? (
    <DuncitButton
      testID="food-order-back-to-menu"
      label={t('mweb.venueFood.order.backToMenu')}
      variant="outline"
      fullWidth
      onPress={() => navigation.popTo('VenueDetails', { venueId: menuVenueId })}
    />
  ) : null;

  let body: ReactNode;
  if (loading) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner {...loadingRegion} testID="food-order-loading" color="$primary" />
      </YStack>
    );
  } else if (order) {
    const paid = order.payment_status !== 'PENDING' && order.payment_status !== 'FAILED';
    body = (
      <RefreshScrollView
        ref={scroll}
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      >
        <SurfaceCard gap={4} testID="food-order-head">
          <Text role="heading" fontSize={18} fontWeight="700" color="$color">
            {t('mweb.venueFood.order.orderNo', { vars: { orderNo: order.order_no } })}
          </Text>
          <Text fontSize={14} color="$muted">
            {order.venue_name}
          </Text>
          <Text
            testID="food-order-status"
            aria-live="polite"
            fontSize={14}
            fontWeight="600"
            color="$color"
          >
            {t('mweb.venueFood.order.statusNow', {
              vars: { status: t(FOOD_ORDER_STATUS_KEYS[order.status]) },
            })}
          </Text>
        </SurfaceCard>
        <FoodOrderPaymentCard
          order={order}
          canRetry={!!clientKey}
          retrying={checkout.submitting}
          retryError={checkout.error}
          onRetry={() => retry(order)}
        />
        {paid ? (
          <SurfaceCard gap={12}>
            <SectionHeader
              testID="food-order-progress-header"
              title={t('mweb.venueFood.order.progress')}
            />
            <OrderDetailTimeline
              steps={buildFoodOrderTimeline(order, t)}
              testID="food-order-timeline"
            />
          </SurfaceCard>
        ) : null}
        <FoodOrderSummary order={order} />
        <FoodOrderFollowUp
          order={order}
          accessKey={accessKey}
          paid={paid}
          onChanged={reload}
          onFeedbackLayout={onFeedbackLayout}
        />
        {backToMenu}
      </RefreshScrollView>
    );
  } else if (error && !NO_ORDER_CODES.has(errorCode)) {
    body = (
      <EmptyState
        testID="food-order-load-failed"
        icon="error-outline"
        title={t('mweb.venueFood.order.loadFailed')}
        actionLabel={t('mweb.ordersHistory.retry')}
        onAction={reload}
      />
    );
  } else {
    body = (
      <YStack flex={1} padding={16} gap={16}>
        <EmptyState
          testID="food-order-missing"
          icon="receipt-long"
          title={t('mweb.venueFood.order.notFound')}
        />
        {backToMenu}
      </YStack>
    );
  }

  return (
    <StackScreen title={t('mweb.venueFood.order.title')} testID="food-order-screen">
      {body}
      <RazorpayWebView {...checkout.gateway} />
    </StackScreen>
  );
}
