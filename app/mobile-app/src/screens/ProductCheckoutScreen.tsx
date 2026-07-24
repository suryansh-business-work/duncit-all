import { useMemo, useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import {
  CheckoutSuccess,
  CouponField,
  CouponTotal,
  ProcessingOverlay,
  ProductOrderSummary,
  RazorpayWebView,
  SavedAddressPicker,
} from '@/components/checkout';
import { ProductDetailSheet } from '@/components/details/ProductDetailSheet';
import { StackScreen } from '@/components/StackScreen';
import { CheckoutForm, type CheckoutFormValues } from '@/forms/checkout';
import { MyAddressesDocument } from '@/graphql/address-book';
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
import { buildBreakup, round2 } from '@/utils/checkout-math';
import { toErrorMessage } from '@/utils/errors';
import { mapLinesToItems, productSubtotal } from '@/utils/product-checkout-input';
import type { RootStackParamList } from '@/navigation/types';

type CheckoutAddress = ResultOf<typeof MyAddressesDocument>['myAddresses'][number];

/** Merge a picked saved address into the checkout form values — the picked
 * address becomes the (non-"same as main") delivery/billing address, and its
 * pincode drives the live delivery quote via the form's pincode watcher. */
function addressToForm(
  address: CheckoutAddress,
  base: Partial<CheckoutFormValues>,
): Partial<CheckoutFormValues> {
  return {
    ...base,
    same_as_main: false,
    full_name: address.name || base.full_name,
    line1: address.line1,
    line2: address.line2,
    landmark: address.landmark,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country || 'India',
  };
}

/** Empty state when the cart was cleared before reaching checkout. */
function EmptyProductCart({ onCart }: Readonly<{ onCart: () => void }>) {
  const { muted, onPrimary } = useThemeColors();
  return (
    <YStack alignItems="center" gap={10} paddingVertical={64} testID="product-checkout-empty">
      <MaterialIcons name="shopping-bag" size={44} color={muted} />
      <Text fontSize={17} fontWeight="900" color="$color">
        Nothing to checkout
      </Text>
      <Text fontSize={13} color="$muted" textAlign="center">
        There are no products in your cart.
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

/** Standalone product checkout — EVERY cart line (all pods) paid in ONE product
 * payment, delivery listed per warehouse (separate from the pod-membership
 * payment). RN twin of mWeb's ProductCheckoutPage. */
export function ProductCheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lines = useCartStore((s) => s.lines);
  const clearAll = useCartStore((s) => s.clearAll);
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
  } = useProductCheckout();

  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [pickedAddress, setPickedAddress] = useState<CheckoutAddress | null>(null);
  const [infoProductId, setInfoProductId] = useState<string | null>(null);
  const {
    quote,
    loading: shippingLoading,
    pincodeValid,
  } = useProductShippingQuote(items, deliveryPincode);

  // Picking a saved address prefills the billing/delivery form (incl. pincode) —
  // the form's pincode watcher then re-quotes delivery for that address.
  const formInitial = useMemo(
    () => (pickedAddress ? addressToForm(pickedAddress, initialValues ?? {}) : initialValues),
    [pickedAddress, initialValues],
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<NonNullable<ProductPayment> | null>(null);
  const [order, setOrder] = useState<RazorpayOrder | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const shippingTotal = quote?.total ?? 0;
  const amount = subtotal + shippingTotal;
  const breakup = buildBreakup(amount, finance);
  const razorpayEnabled = !!finance?.razorpay_enabled;
  const dummyMode = !razorpayEnabled && (finance?.dummy_mode ?? true);
  const appliedCode = coupon?.ok ? (coupon.code ?? null) : null;
  // The server discounts the PRODUCT SUBTOTAL only, then adds shipping — mirror
  // that here so the "You pay" amount always equals the charged amount.
  const discountedPay = coupon?.ok ? round2(coupon.final_total + shippingTotal) : null;
  const effectiveTotal = discountedPay ?? breakup?.total ?? amount;
  const payContext = { items, couponCode: appliedCode };

  const finishSuccess = (result: NonNullable<ProductPayment>) => {
    clearAll();
    setPayment(result);
  };

  const applyCoupon = async (codeArg?: string) => {
    const code = (codeArg ?? couponCode).trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      // Coupons discount the product subtotal only — never the shipping charge.
      const preview = await previewCoupon(code, subtotal);
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
        <SavedAddressPicker onPick={setPickedAddress} />
        <ProductOrderSummary
          lines={lines}
          breakup={breakup}
          subtotal={subtotal}
          quote={quote}
          shippingLoading={shippingLoading}
          pincodeValid={pincodeValid}
          onInfo={setInfoProductId}
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
          initialValues={formInitial}
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
      <ProductDetailSheet
        productId={infoProductId}
        onClose={() => setInfoProductId(null)}
        readOnly
      />
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
