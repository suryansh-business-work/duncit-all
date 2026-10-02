import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { usePaymentFailure } from '@/components/payment-failure';
import {
  buildCheckoutContact,
  useCheckout,
  type CheckoutPayment,
  type CouponPreview,
  type RazorpayOrder,
} from '@/hooks/useCheckout';
import { usePodCheckoutBill } from '@/hooks/usePodCheckoutBill';
import { coinCheckoutSummary } from '@duncit/utils';
import { useCoinBalance } from '@/hooks/useCoins';
import { useServerIssue } from '@/hooks/useServerIssue';
import { usePodTicket } from '@/hooks/usePodHistory';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/** Which pay mutation the submit will call — named for the issue log. Module
 * scope so its branch stays off the screen's own complexity budget (S3776). */
const payOperationName = (razorpayEnabled: boolean) =>
  razorpayEnabled ? 'createRazorpayOrder' : 'dummyCheckout';

/** Everything the pod checkout reads: the pod + finance, the bill, coupon and
 * coin state, and the payment in flight. */
export function useCheckoutState() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Checkout'>>();
  const podId = route.params?.podId ?? '';
  const checkout = useCheckout(podId, Math.max(1, Number(route.params?.seats ?? 1) || 1));
  const { finance, pod, me, isLoading } = checkout;
  const { download: downloadTicket } = usePodTicket();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<NonNullable<CheckoutPayment> | null>(null);
  const [order, setOrder] = useState<RazorpayOrder | null>(null);
  const [alreadyBookedOpen, setAlreadyBookedOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Pod checkout pays the membership (pod_amount) ONLY — products are a separate
  // payment through the standalone product checkout. Never mix the two.
  // Seats ride in from Pod Details. The ticket price multiplies; the server
  // re-prices and re-checks capacity, so this is a preview, never the charge.
  // The multi-ticket tier comes off first, then the coupon, coins and GST.
  const seats = Math.max(1, Number(route.params?.seats ?? 1) || 1);
  const { ticket, breakup, coins, payBreakup, discounts } = usePodCheckoutBill(
    pod,
    seats,
    finance,
    coupon,
  );
  const amount = ticket.gross;
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
  // Earned on what is ACTUALLY charged — the server credits on the total after
  // coins are spent, so previewing off the gross would promise coins that never
  // arrive. A pod ticket earns at the pod rate.
  const { balance: coinBalance } = useCoinBalance();
  const coinSummary = coinCheckoutSummary({
    balance: coins.balance,
    applied: coins.applied,
    payable: coins.effectiveTotal,
    earnPct: coinBalance?.earn_pct ?? 0,
  });
  // Server-operation failures, parsed + logged once by the shared error module.
  const serverIssue = useServerIssue('Checkout');
  const payOperation = payOperationName(razorpayEnabled);
  const onDownloadTicket = podId ? () => downloadTicket(podId) : undefined;
  // Render the contact from the freshly-loaded profile (not just the form
  // prefill), with a spinner while it is still loading, so the card is robust.
  const contact = buildCheckoutContact(me);
  const contactLoading = isLoading && !me;

  return {
    t,
    navigation,
    podId,
    checkout,
    submitting,
    setSubmitting,
    error,
    setError,
    payment,
    setPayment,
    order,
    setOrder,
    alreadyBookedOpen,
    setAlreadyBookedOpen,
    couponCode,
    setCouponCode,
    coupon,
    setCoupon,
    couponError,
    setCouponError,
    applyingCoupon,
    setApplyingCoupon,
    seats,
    ticket,
    breakup,
    coins,
    payBreakup,
    discounts,
    amount,
    razorpayEnabled,
    dummyMode,
    paymentFailure,
    appliedCode,
    coinSummary,
    serverIssue,
    payOperation,
    onDownloadTicket,
    contact,
    contactLoading,
  };
}

export type CheckoutState = ReturnType<typeof useCheckoutState>;
