import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { usePaymentFailure } from '@/components/payment-failure';
import { buildBreakup, round2 } from '@/utils/checkout-math';
import type { CouponPreview } from '@/hooks/checkoutRequests';
import type { RazorpayOrder } from '@/hooks/useCheckout';
import { useCoinRedemption } from '@/hooks/useCoinRedemption';
import { coinCheckoutSummary } from '@duncit/utils';
import { useCoinBalance } from '@/hooks/useCoins';
import { useProductCheckout, type ProductPayment } from '@/hooks/useProductCheckout';
import { useProductShippingQuote } from '@/hooks/useProductShippingQuote';
import { useTranslation } from '@/hooks/useTranslation';
import { useCartStore } from '@/stores/cart.store';
import { mapLinesToItems, productSubtotal, toPickedContact } from '@/utils/product-checkout-input';
import type { RootStackParamList } from '@/navigation/types';

import { addressToForm, type CheckoutAddress } from './addressToForm';

/** Everything the product checkout reads: the cart, the checkout data, the
 * delivery quote, coupon/coin state and the payment in flight. */
export function useProductCheckoutState() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lines = useCartStore((s) => s.lines);
  const clearAll = useCartStore((s) => s.clearAll);
  const items = useMemo(() => mapLinesToItems(lines), [lines]);
  const subtotal = useMemo(() => productSubtotal(lines), [lines]);

  const checkout = useProductCheckout();
  const { finance, initialValues } = checkout;

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
  // What an agent needs if a payment times out and a ticket has to be opened.
  const paymentFailure = usePaymentFailure(() => ({
    description: `Products (${items.length} line${items.length === 1 ? '' : 's'})`,
    amount: breakup?.total ?? amount,
    currencySymbol: breakup?.currency,
  }));
  const razorpayEnabled = !!finance?.razorpay_enabled;
  const dummyMode = !razorpayEnabled && (finance?.dummy_mode ?? true);
  const appliedCode = coupon?.ok ? (coupon.code ?? null) : null;
  // The server discounts the PRODUCT SUBTOTAL only, then adds shipping — mirror
  // that here so the "You pay" amount always equals the charged amount. Coins
  // then redeem against that bill.
  const discountedPay = coupon?.ok ? round2(coupon.final_total + shippingTotal) : null;
  const coins = useCoinRedemption(discountedPay ?? breakup?.total ?? amount);
  // A shop order earns at its OWN rate — a physical product carries a cost of
  // goods a pod seat does not, so the two rates are configured separately.
  const { balance: coinBalance } = useCoinBalance();
  const coinSummary = coinCheckoutSummary({
    balance: coins.balance,
    applied: coins.applied,
    payable: coins.effectiveTotal,
    earnPct: coinBalance?.shop_earn_pct ?? 0,
  });
  const payContext = {
    items,
    couponCode: appliedCode,
    pickedContact: toPickedContact(pickedAddress),
    redeemCoins: coins.applied,
  };

  return {
    t,
    navigation,
    lines,
    clearAll,
    subtotal,
    checkout,
    setDeliveryPincode,
    setPickedAddress,
    infoProductId,
    setInfoProductId,
    quote,
    shippingLoading,
    pincodeValid,
    formInitial,
    submitting,
    setSubmitting,
    error,
    setError,
    payment,
    setPayment,
    order,
    setOrder,
    couponCode,
    setCouponCode,
    coupon,
    setCoupon,
    couponError,
    setCouponError,
    applyingCoupon,
    setApplyingCoupon,
    breakup,
    paymentFailure,
    razorpayEnabled,
    dummyMode,
    coins,
    coinSummary,
    payContext,
  };
}

export type ProductCheckoutState = ReturnType<typeof useProductCheckoutState>;
