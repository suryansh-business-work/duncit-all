import type { ReactNode } from 'react';
import { Spinner, Text, YStack } from 'tamagui';

import { CheckoutSuccess, ProcessingOverlay, RazorpayWebView } from '@/components/checkout';
import { ProductDetailSheet } from '@/components/details/ProductDetailSheet';
import { PaymentFailureDialog } from '@/components/payment-failure';
import { StackScreen } from '@/components/StackScreen';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useLoadingRegion } from '@/components/Skeleton';

import { EmptyProductCart } from './EmptyProductCart';
import { productCheckoutActions } from './productCheckoutActions';
import { ProductCheckoutForm } from './ProductCheckoutForm';
import { useProductCheckoutState } from './useProductCheckoutState';

/** Standalone product checkout — EVERY cart line (all pods) paid in ONE product
 * payment, delivery listed per warehouse (separate from the pod-membership
 * payment). RN twin of mWeb's ProductCheckoutPage. */
export function ProductCheckoutScreen() {
  const loadingRegion = useLoadingRegion();
  const s = useProductCheckoutState();
  const { t, navigation, payment, breakup, order, setOrder, paymentFailure } = s;
  const { finance, isLoading, confirmingMessage, downloadInvoice } = s.checkout;
  const actions = productCheckoutActions(s);

  let body: ReactNode;
  if (payment) {
    body = (
      <RefreshScrollView contentContainerStyle={{ padding: 16 }}>
        <CheckoutSuccess
          payment={payment}
          onDownloadInvoice={() => downloadInvoice(payment.id, payment.invoice_no ?? 'invoice')}
          onHome={() => navigation.navigate('Home')}
          onProfile={() => navigation.navigate('OrdersHistory')}
          profileLabel={t('mweb.checkout.myOrders')}
        />
      </RefreshScrollView>
    );
  } else if (s.lines.length === 0) {
    body = <EmptyProductCart onCart={() => navigation.navigate('Home', { screen: 'Cart' })} />;
  } else if (isLoading && !finance) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner {...loadingRegion} testID="product-checkout-loading" color="$primary" />
      </YStack>
    );
  } else if (breakup) {
    body = <ProductCheckoutForm s={s} actions={actions} breakup={breakup} />;
  } else {
    body = (
      <Text testID="product-checkout-unavailable" padding={24} color="$muted">
        {t('mweb.checkout.unavailable')}
      </Text>
    );
  }

  return (
    <StackScreen title={t('mweb.checkout.productTitle')} testID="product-checkout-screen">
      {body}
      <ProductDetailSheet
        productId={s.infoProductId}
        onClose={() => s.setInfoProductId(null)}
        readOnly
      />
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
          s.setError(null);
        }}
      />
      <ProcessingOverlay open={s.submitting} message={confirmingMessage} />
    </StackScreen>
  );
}
