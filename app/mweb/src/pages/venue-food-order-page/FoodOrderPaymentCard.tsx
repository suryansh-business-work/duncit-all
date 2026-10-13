import { Alert, AlertTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { VenueFoodOrder } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { FoodCheckoutError } from '../VenueDetailsPage/food/useFoodCheckout';

interface Props {
  order: VenueFoodOrder;
  /** This device placed the order, so it can reopen the same payment. */
  canRetry: boolean;
  retrying: boolean;
  retryError: FoodCheckoutError | null;
  onRetry: () => void;
}

/**
 * What the guest needs to know about the money, when it is not simply paid:
 * a payment still being confirmed (with a way to pay again), one that failed,
 * or a cancelled order and where its refund has got to. A paid, live order
 * shows nothing here — its timeline says it all.
 */
export default function FoodOrderPaymentCard({ order, canRetry, retrying, retryError, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  const cancelled = order.status === 'CANCELLED';

  if (cancelled) {
    return (
      <Alert severity="warning" data-testid="food-order-cancelled">
        <AlertTitle>{t('mweb.venueFood.order.cancelledTitle')}</AlertTitle>
        <Stack spacing={0.5}>
          {order.cancel_reason && (
            <Typography variant="body2">
              {t('mweb.venueFood.order.cancelReason', { vars: { reason: order.cancel_reason } })}
            </Typography>
          )}
          {order.payment_status === 'REFUND_PENDING' && (
            <Typography variant="body2">{t('mweb.venueFood.order.refundPending')}</Typography>
          )}
          {order.payment_status === 'REFUNDED' && <Typography variant="body2">{t('mweb.venueFood.order.refunded')}</Typography>}
        </Stack>
      </Alert>
    );
  }

  if (order.payment_status === 'FAILED') {
    return (
      <Alert severity="error" data-testid="food-order-payment-failed">
        <AlertTitle>{t('mweb.venueFood.payment.failed')}</AlertTitle>
        {t('mweb.venueFood.order.paymentFailedBody')}
      </Alert>
    );
  }

  if (order.payment_status !== 'PENDING') return null;

  return (
    <Stack spacing={1.5} data-testid="food-order-payment-pending">
      <Alert severity="info">
        <AlertTitle>{t('mweb.venueFood.order.waitingPayment')}</AlertTitle>
        {t('mweb.venueFood.order.waitingPaymentBody')}
      </Alert>
      {retryError && (
        <Alert severity="error" data-testid="food-order-retry-error">
          {retryError.title && <AlertTitle>{retryError.title}</AlertTitle>}
          {retryError.message}
        </Alert>
      )}
      {canRetry && (
        <DuncitButton
          variant="contained"
          size="large"
          fullWidth
          loading={retrying}
          disabled={retrying}
          onClick={onRetry}
          data-testid="food-order-retry-payment"
        >
          {t(retryError ? 'mweb.venueFood.order.retryPayment' : 'mweb.venueFood.order.payNow')}
        </DuncitButton>
      )}
    </Stack>
  );
}
