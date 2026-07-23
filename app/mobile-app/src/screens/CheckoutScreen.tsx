import { useState, type ReactNode } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import {
  CheckoutSuccess,
  CouponField,
  CouponTotal,
  OrderSummary,
  ProcessingOverlay,
  RazorpayWebView,
} from '@/components/checkout';
import { StackScreen } from '@/components/StackScreen';
import { CheckoutForm, type CheckoutFormValues } from '@/forms/checkout';
import {
  buildCheckoutContact,
  useCheckout,
  type CheckoutPayment,
  type CouponPreview,
  type RazorpayOrder,
  type RazorpaySignature,
} from '@/hooks/useCheckout';
import { usePodTicket } from '@/hooks/usePodHistory';
import type { RootStackParamList } from '@/navigation/types';
import { buildBreakup } from '@/utils/checkout-math';
import { toErrorMessage } from '@/utils/errors';

/** Checkout — order summary + contact/payment form. Uses the dummy gateway when
 * finance dummy_mode is on, else live Razorpay. RN twin of mWeb's CheckoutPage. */
export function CheckoutScreen() {
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
  } = useCheckout(podId);
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
  const amount = Number(pod?.pod_amount ?? 0);
  const breakup = buildBreakup(amount, finance);
  // Razorpay takes precedence whenever its Tech-portal keys are set; the dummy
  // gateway is only a local fallback.
  const razorpayEnabled = !!finance?.razorpay_enabled;
  const dummyMode = !razorpayEnabled && (finance?.dummy_mode ?? true);
  const appliedCode = coupon?.ok ? coupon.code : null;
  const effectiveTotal = coupon?.ok ? coupon.final_total : (breakup?.total ?? amount);
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
        setCouponError(preview?.message ?? 'Invalid coupon code');
      }
    } catch (e) {
      setCoupon(null);
      setCouponError(toErrorMessage(e, 'Could not apply coupon'));
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
      else setError('Payment could not be verified.');
    } catch (e) {
      setError(toErrorMessage(e, 'Payment could not be verified.'));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (values: CheckoutFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      if (razorpayEnabled) {
        const created = await createRazorpayOrder(values, amount, appliedCode);
        // 100%-off coupon → completed server-side, skip the gateway sheet.
        if (created.free && created.payment) setPayment(created.payment);
        else setOrder(created);
        return;
      }
      if (dummyMode) {
        const result = await pay(values, amount, appliedCode);
        if (result?.status === 'SUCCESS') setPayment(result);
        else setError('Payment failed. Please try again.');
        return;
      }
      setError('Online payments are not configured yet. Please try again later.');
    } catch (e) {
      setError(toErrorMessage(e, 'Payment failed. Please try again.'));
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
        <OrderSummary pod={pod} breakup={breakup} />
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
        <CouponTotal
          coupon={coupon}
          currency={breakup.currency}
          effectiveTotal={effectiveTotal}
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
          onSubmit={submit}
        />
      </ScrollView>
    );
  } else {
    checkoutBody = (
      <Text testID="checkout-unavailable" padding={24} color="$muted">
        Checkout is unavailable right now. Please try again later.
      </Text>
    );
  }

  return (
    <StackScreen title="Checkout" testID="checkout-screen">
      {checkoutBody}
      <RazorpayWebView
        order={order}
        open={!!order}
        onSuccess={finishVerify}
        onDismiss={() => {
          setOrder(null);
          setError('Payment was cancelled.');
        }}
      />
      <ProcessingOverlay open={submitting} />
    </StackScreen>
  );
}
