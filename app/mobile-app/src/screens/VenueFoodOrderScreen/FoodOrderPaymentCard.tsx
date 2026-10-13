import { YStack } from 'tamagui';
import type { VenueFoodOrder } from '@duncit/utils';

import { NoticeCard } from '@/components/attendance/NoticeCard';
import { DuncitButton } from '@/components/DuncitButton';
import type { FoodCheckoutError } from '@/hooks/useFoodCheckout';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  order: VenueFoodOrder;
  /** This device placed the order, so it can reopen the same payment. */
  canRetry: boolean;
  retrying: boolean;
  retryError: FoodCheckoutError | null;
  onRetry: () => void;
}

/** Why the order was cancelled and where its refund has got to, as one paragraph. */
function useCancelledBody(order: VenueFoodOrder): string | undefined {
  const { t } = useTranslation();
  const lines: string[] = [];
  if (order.cancel_reason) {
    lines.push(t('mweb.venueFood.order.cancelReason', { vars: { reason: order.cancel_reason } }));
  }
  if (order.payment_status === 'REFUND_PENDING')
    lines.push(t('mweb.venueFood.order.refundPending'));
  if (order.payment_status === 'REFUNDED') lines.push(t('mweb.venueFood.order.refunded'));
  return lines.length ? lines.join('\n') : undefined;
}

/**
 * What the member needs to know about the money, when it is not simply paid:
 * a payment still being confirmed (with a way to pay again), one that failed,
 * or a cancelled order and where its refund has got to. A paid, live order
 * shows nothing here — its timeline says it all. Tamagui twin of mWeb's
 * venue-food-order-page/FoodOrderPaymentCard.
 */
export function FoodOrderPaymentCard({
  order,
  canRetry,
  retrying,
  retryError,
  onRetry,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const cancelledBody = useCancelledBody(order);

  if (order.status === 'CANCELLED') {
    return (
      <NoticeCard
        testID="food-order-cancelled"
        tone="warning"
        title={t('mweb.venueFood.order.cancelledTitle')}
        body={cancelledBody}
      />
    );
  }

  if (order.payment_status === 'FAILED') {
    return (
      <NoticeCard
        testID="food-order-payment-failed"
        tone="danger"
        title={t('mweb.venueFood.payment.failed')}
        body={t('mweb.venueFood.order.paymentFailedBody')}
      />
    );
  }

  if (order.payment_status !== 'PENDING') return null;

  return (
    <YStack gap={12} testID="food-order-payment-pending">
      <NoticeCard
        tone="info"
        icon="schedule"
        title={t('mweb.venueFood.order.waitingPayment')}
        body={t('mweb.venueFood.order.waitingPaymentBody')}
      />
      {retryError ? (
        <YStack role="alert">
          <NoticeCard
            testID="food-order-retry-error"
            tone="danger"
            title={retryError.title ?? retryError.message}
            body={retryError.title ? retryError.message : undefined}
          />
        </YStack>
      ) : null}
      {canRetry ? (
        <DuncitButton
          testID="food-order-retry-payment"
          label={t(
            retryError ? 'mweb.venueFood.order.retryPayment' : 'mweb.venueFood.order.payNow',
          )}
          size="lg"
          fullWidth
          loading={retrying}
          disabled={retrying}
          onPress={onRetry}
        />
      ) : null}
    </YStack>
  );
}
