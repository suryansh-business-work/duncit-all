import type { ReactNode } from 'react';
import { Spinner, Text, YStack } from 'tamagui';

import {
  CheckoutSuccess,
  AlreadyBookedDialog,
  ProcessingOverlay,
  RazorpayWebView,
} from '@/components/checkout';
import { PaymentFailureDialog } from '@/components/payment-failure';
import { StackScreen } from '@/components/StackScreen';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useLoadingRegion } from '@/components/Skeleton';

import { checkoutActions } from './checkoutActions';
import { CheckoutPayForm } from './CheckoutPayForm';
import { useCheckoutState } from './useCheckoutState';

/** Checkout — order summary + contact/payment form. Uses the dummy gateway when
 * finance dummy_mode is on, else live Razorpay. RN twin of mWeb's CheckoutPage. */
export function CheckoutScreen() {
  const loadingRegion = useLoadingRegion();
  const s = useCheckoutState();
  const { t, navigation, checkout, payment, breakup, order, setOrder, paymentFailure } = s;
  const { finance, pod, isLoading, downloadInvoice, confirmingMessage } = checkout;
  const actions = checkoutActions(s);

  let checkoutBody: ReactNode;
  if (isLoading && !finance) {
    checkoutBody = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner {...loadingRegion} testID="checkout-loading" color="$primary" />
      </YStack>
    );
  } else if (breakup) {
    checkoutBody = payment ? (
      <RefreshScrollView contentContainerStyle={{ padding: 16 }}>
        <CheckoutSuccess
          payment={payment}
          pod={pod}
          onDownloadInvoice={() => downloadInvoice(payment.id, payment.invoice_no ?? 'invoice')}
          onDownloadTicket={s.onDownloadTicket}
          onHome={() => navigation.navigate('Home')}
          onProfile={() => navigation.navigate('PodHistory')}
        />
      </RefreshScrollView>
    ) : (
      <CheckoutPayForm s={s} actions={actions} breakup={breakup} />
    );
  } else {
    checkoutBody = (
      <Text testID="checkout-unavailable" padding={24} color="$muted">
        {t('mweb.checkout.unavailable')}
      </Text>
    );
  }

  return (
    <StackScreen title={t('mweb.checkout.title')} testID="checkout-screen">
      {checkoutBody}
      <RazorpayWebView
        order={order}
        open={!!order}
        onSuccess={actions.finishVerify}
        onFailure={(error) => {
          // Close the sheet, then say what actually happened — every failure
          // used to be reported as the buyer's own cancellation.
          setOrder(null);
          paymentFailure.report(error).catch(() => undefined);
        }}
      />
      <PaymentFailureDialog
        failure={paymentFailure.failure}
        ticketNo={paymentFailure.ticketNo}
        ticketPending={paymentFailure.ticketPending}
        ticketFailed={paymentFailure.ticketFailed}
        onClose={paymentFailure.dismiss}
        onRetry={() => {
          paymentFailure.dismiss();
          s.setError('');
        }}
      />
      <AlreadyBookedDialog
        open={s.alreadyBookedOpen}
        onClose={() => s.setAlreadyBookedOpen(false)}
        onHistory={() => {
          s.setAlreadyBookedOpen(false);
          navigation.navigate('PodHistory');
        }}
      />
      <ProcessingOverlay open={s.submitting} message={confirmingMessage} />
    </StackScreen>
  );
}
