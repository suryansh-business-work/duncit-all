import { useState, type ReactNode } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import {
  CheckoutSuccess,
  CoinRedeemField,
  CouponField,
  CouponTotal,
  OrderSummary,
  ProcessingOverlay,
  RazorpayWebView,
} from '@/components/checkout';
import { PaymentFailureDialog, usePaymentFailure } from '@/components/payment-failure';
import { StackScreen } from '@/components/StackScreen';
import { formatMoney } from '@/utils/checkout-math';
import { CheckoutForm, type CheckoutFormValues } from '@/forms/checkout';
import {
  buildCheckoutContact,
  useCheckout,
  type CheckoutPayment,
  type CouponPreview,
  type RazorpayOrder,
  type RazorpaySignature,
} from '@/hooks/useCheckout';
import { useCoinRedemption } from '@/hooks/useCoinRedemption';
import { usePodTicket } from '@/hooks/usePodHistory';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { buildBreakup } from '@/utils/checkout-math';
import { toErrorMessage } from '@/utils/errors';

/** Checkout — order summary + contact/payment form. Uses the dummy gateway when
 * finance dummy_mode is on, else live Razorpay. RN twin of mWeb's CheckoutPage. */
export function CheckoutScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Checkout'>>();
  const podId = route.params?.podId ?? '';
  const {
    finance,
    pod,
    me,
    initialValues,
    availableCoupons,
    isLoading,
    pay,
    createRazorpayOrder,
    verifyRazorpay,
    previewCoupon,
    downloadInvoice,
  } = useCheckout(podId, Math.max(1, Number(route.params?.seats ?? 1) || 1));
  const { download: downloadTicket } = usePodTicket();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<NonNullable<CheckoutPayment> | null>(null);
  const [order, setOrder] = useState<RazorpayOrder | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Pod checkout pays the membership (pod_amount) ONLY — products are a separate
  // payment through the standalone product checkout. Never mix the two.
  // Seats ride in from Pod Details. The ticket price multiplies; the server
  // re-prices and re-checks capacity, so this is a preview, never the charge.
  const seats = Math.max(1, Number(route.params?.seats ?? 1) || 1);
  const amount = Math.round(Number(pod?.pod_amount ?? 0) * seats * 100) / 100;
  const breakup = buildBreakup(amount, finance);
  // Razorpay takes precedence whenever its Tech-portal keys are set; the dummy
  // gateway is only a local fallback.
  const razorpayEnabled = !!finance?.razorpay_enabled;
  const dummyMode = !razorpayEnabled && (finance?.dummy_mode ?? true);
  // What an agent needs if a payment times out and a ticket has to be opened.
  const paymentFailure = usePaymentFailure(() => ({
    description: pod?.pod_title ? `Pod: ${pod.pod_title}` : 'Pod checkout',
    amount: breakup?.total ?? amount,
    paymentDocId: order?.payment_doc_id ?? null,
  }));
  const appliedCode = coupon?.ok ? coupon.code : null;
  // The coupon discounts the whole pod bill, so coins redeem against its result.
  const payableAfterCoupon = coupon?.ok ? coupon.final_total : (breakup?.total ?? amount);
  const coins = useCoinRedemption(payableAfterCoupon);
  const onDownloadTicket = podId ? () => downloadTicket(podId) : undefined;
  // Render the contact from the freshly-loaded profile (not just the form
  // prefill), with a spinner while it is still loading, so the card is robust.
  const contact = buildCheckoutContact(me);
  const contactLoading = isLoading && !me;

  const applyCoupon = async (codeArg?: string) => {
    const code = (codeArg ?? couponCode).trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const preview = await previewCoupon(code, amount);
      if (preview?.ok) setCoupon(preview);
      else {
        setCoupon(null);
        setCouponError(preview?.message ?? t('mweb.checkout.errorCouponInvalid'));
      }
    } catch (e) {
      setCoupon(null);
      setCouponError(toErrorMessage(e, t('mweb.checkout.errorCouponApply')));
    } finally {
      setApplyingCoupon(false);
    }
  };
  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const finishVerify = async (sig: RazorpaySignature) => {
    /* istanbul ignore next -- the Razorpay sheet only mounts when an order exists */
    if (!order) return;
    setOrder(null);
    setSubmitting(true);
    setError(null);
    try {
      const result = await verifyRazorpay(order.payment_doc_id, sig);
      if (result?.status === 'SUCCESS') setPayment(result);
      else setError(t('mweb.checkout.errorNotVerified'));
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.checkout.errorNotVerified')));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (values: CheckoutFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      if (razorpayEnabled) {
        const created = await createRazorpayOrder(values, amount, appliedCode, coins.applied);
        // 100%-off coupon → completed server-side, skip the gateway sheet.
        if (created.free && created.payment) setPayment(created.payment);
        else setOrder(created);
        return;
      }
      if (dummyMode) {
        const result = await pay(values, amount, appliedCode, coins.applied);
        if (result?.status === 'SUCCESS') setPayment(result);
        else setError(t('mweb.checkout.errorFailed'));
        return;
      }
      setError(t('mweb.checkout.errorNotConfigured'));
    } catch (e) {
      setError(toErrorMessage(e, t('mweb.checkout.errorFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  let checkoutBody: ReactNode;
  if (isLoading && !finance) {
    checkoutBody = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner testID="checkout-loading" color="$primary" />
      </YStack>
    );
  } else if (breakup) {
    checkoutBody = payment ? (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <CheckoutSuccess
          payment={payment}
          pod={pod}
          onDownloadInvoice={() => downloadInvoice(payment.id, payment.invoice_no ?? 'invoice')}
          onDownloadTicket={onDownloadTicket}
          onHome={() => navigation.navigate('Home')}
          onProfile={() => navigation.navigate('PodHistory')}
        />
      </ScrollView>
    ) : (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <OrderSummary
          pod={pod}
          breakup={breakup}
          seats={seats}
          unitAmount={Number(pod?.pod_amount) || 0}
        />
        <CouponField
          code={couponCode}
          setCode={setCouponCode}
          applied={coupon}
          error={couponError}
          applying={applyingCoupon}
          currency={breakup.currency}
          available={availableCoupons}
          onApply={applyCoupon}
          onRemove={removeCoupon}
        />
        <CoinRedeemField coins={coins} />
        <CouponTotal
          currency={breakup.currency}
          effectiveTotal={coins.effectiveTotal}
          originalTotal={breakup.total}
        />
        <CheckoutForm
          initialValues={initialValues}
          mainAddress={me?.address ?? null}
          contact={contact}
          contactLoading={contactLoading}
          loading={submitting}
          errorMessage={error}
          dummyMode={dummyMode}
          // The number goes ON the button. On a multi-seat booking the summary
          // has usually scrolled away by the time the buyer reaches it, and the
          // last thing they read before paying should be what they will pay.
          payLabel={t('mweb.checkout.pay', {
            vars: { amount: formatMoney(breakup.currency, coins.effectiveTotal) },
          })}
          onSubmit={submit}
        />
      </ScrollView>
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
        onSuccess={finishVerify}
        onFailure={(error) => {
          // Close the sheet, then say what actually happened — every failure
          // used to be reported as the buyer's own cancellation.
          setOrder(null);
          void paymentFailure.report(error);
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
          setError('');
        }}
      />
      <ProcessingOverlay open={submitting} />
    </StackScreen>
  );
}
