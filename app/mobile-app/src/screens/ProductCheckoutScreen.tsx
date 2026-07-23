import { useMemo, useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import {
  CheckoutSuccess,
  CouponField,
  CouponTotal,
  ProcessingOverlay,
  ProductOrderSummary,
  RazorpayWebView,
} from '@/components/checkout';
import { StackScreen } from '@/components/StackScreen';
import { CheckoutForm, type CheckoutFormValues } from '@/forms/checkout';
import type { CouponPreview } from '@/hooks/checkoutRequests';
import {
  buildCheckoutContact,
  type RazorpayOrder,
  type RazorpaySignature,
} from '@/hooks/useCheckout';
import { useProductCheckout, type ProductPayment } from '@/hooks/useProductCheckout';
import { useProductShippingQuote } from '@/hooks/useProductShippingQuote';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useCartStore } from '@/stores/cart.store';
import { buildBreakup } from '@/utils/checkout-math';
import { toErrorMessage } from '@/utils/errors';
import { mapLinesToItems, productSubtotal } from '@/utils/product-checkout-input';
import type { RootStackParamList } from '@/navigation/types';

/** Empty state when the pod's cart lines were cleared before reaching checkout. */
function EmptyProductCart({ onCart }: Readonly<{ onCart: () => void }>) {
  const { muted, onPrimary } = useThemeColors();
  return (
    <YStack alignItems="center" gap={10} paddingVertical={64} testID="product-checkout-empty">
      <MaterialIcons name="shopping-bag" size={44} color={muted} />
      <Text fontSize={17} fontWeight="900" color="$color">
        Nothing to checkout
      </Text>
      <Text fontSize={13} color="$muted" textAlign="center">
        This pod has no products in your cart.
      </Text>
      <XStack
        testID="product-checkout-back-to-cart"
        role="button"
        aria-label="Back to cart"
        onPress={onCart}
        paddingHorizontal={24}
        height={44}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="900" color={onPrimary}>
          Back to cart
        </Text>
      </XStack>
    </YStack>
  );
}

/** Standalone product checkout — one pod's cart lines paid through the product
 * engine (separate from the pod-membership payment). RN twin of mWeb's
 * ProductCheckoutPage. */
export function ProductCheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductCheckout'>>();
  const podId = route.params?.podId ?? '';
  const allLines = useCartStore((s) => s.lines);
  const clearPod = useCartStore((s) => s.clearPod);
  const lines = useMemo(() => allLines.filter((line) => line.pod_id === podId), [allLines, podId]);
  const podTitle = lines[0]?.pod_title || 'Your order';
  const items = useMemo(() => mapLinesToItems(lines), [lines]);
  const subtotal = useMemo(() => productSubtotal(lines), [lines]);

  const {
    finance,
    me,
    initialValues,
    availableCoupons,
    isLoading,
    payProduct,
    createRazorpayProductOrder,
    verifyRazorpay,
    previewCoupon,
    downloadInvoice,
  } = useProductCheckout(podId);

  const [deliveryPincode, setDeliveryPincode] = useState('');
  const {
    quote,
    loading: shippingLoading,
    pincodeValid,
  } = useProductShippingQuote(items, deliveryPincode);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<NonNullable<ProductPayment> | null>(null);
  const [order, setOrder] = useState<RazorpayOrder | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const amount = subtotal + (quote?.total ?? 0);
  const breakup = buildBreakup(amount, finance);
  const razorpayEnabled = !!finance?.razorpay_enabled;
  const dummyMode = !razorpayEnabled && (finance?.dummy_mode ?? true);
  const appliedCode = coupon?.ok ? (coupon.code ?? null) : null;
  const effectiveTotal = coupon?.ok ? coupon.final_total : (breakup?.total ?? amount);
  const payContext = { items, podTitle, couponCode: appliedCode };

  const finishSuccess = (result: NonNullable<ProductPayment>) => {
    clearPod(podId);
    setPayment(result);
  };

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
      if (result?.status === 'SUCCESS') finishSuccess(result);
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
        const created = await createRazorpayProductOrder(values, payContext);
        if (created.free && created.payment) finishSuccess(created.payment);
        else setOrder(created);
        return;
      }
      if (dummyMode) {
        const result = await payProduct(values, payContext);
        if (result?.status === 'SUCCESS') finishSuccess(result);
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

  let body: ReactNode;
  if (payment) {
    body = (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <CheckoutSuccess
          payment={payment}
          onDownloadInvoice={() => downloadInvoice(payment.id, payment.invoice_no ?? 'invoice')}
          onHome={() => navigation.navigate('Home')}
          onProfile={() => navigation.navigate('OrdersHistory')}
          profileLabel="My orders"
        />
      </ScrollView>
    );
  } else if (lines.length === 0) {
    body = <EmptyProductCart onCart={() => navigation.navigate('Cart')} />;
  } else if (isLoading && !finance) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner testID="product-checkout-loading" color="$primary" />
      </YStack>
    );
  } else if (breakup) {
    body = (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <ProductOrderSummary
          podTitle={podTitle}
          lines={lines}
          breakup={breakup}
          subtotal={subtotal}
          quote={quote}
          shippingLoading={shippingLoading}
          pincodeValid={pincodeValid}
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
        <CouponTotal
          coupon={coupon}
          currency={breakup.currency}
          effectiveTotal={effectiveTotal}
          originalTotal={breakup.total}
        />
        <CheckoutForm
          initialValues={initialValues}
          mainAddress={me?.address ?? null}
          contact={buildCheckoutContact(me)}
          contactLoading={isLoading && !me}
          loading={submitting}
          errorMessage={error}
          dummyMode={dummyMode}
          onPincodeChange={setDeliveryPincode}
          onSubmit={submit}
        />
      </ScrollView>
    );
  } else {
    body = (
      <Text testID="product-checkout-unavailable" padding={24} color="$muted">
        Checkout is unavailable right now. Please try again later.
      </Text>
    );
  }

  return (
    <StackScreen title="Product checkout" testID="product-checkout-screen">
      {body}
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
