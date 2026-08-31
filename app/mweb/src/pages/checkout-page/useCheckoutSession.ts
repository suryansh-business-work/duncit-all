import { useEffect, useMemo, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  makeCheckoutSchema,
  makeProductCheckoutSchema,
  checkoutDefaults,
  resolveBillingAddress,
  shouldPersistMainAddress,
} from './checkout';
import { useTranslation } from '../../i18n/useTranslation';
import {
  classifyConfirmedPayment,
  confirmPaymentAfterTransportFailure,
  isTransportError,
} from '@duncit/utils';
import {
  AVAILABLE_COUPONS,
  CHECKOUT_ME,
  MY_PAYMENT,
  PREVIEW_COUPON,
  PUBLIC_FINANCE,
  UPDATE_MY_PROFILE,
  VERIFY_RAZORPAY_PAYMENT,
  type CheckoutContact,
  type CheckoutForm,
  type CheckoutPaymentRow,
  type CouponPreview,
} from './queries';
import { loadRazorpay, type RazorpaySignature } from './razorpayCheckout';
import { MY_COIN_BALANCE } from '../duncit-coin-page/queries';
import { parseApiError } from '../../utils/parseApiError';
import type { UserAddress } from '../account-page/address-book-form';

/** Parcel contact taken from the picked address-book entry. */
export interface PickedContact {
  name: string;
  phone: string;
  email: string;
}

interface Args {
  /** Pod the coupons/preview are scoped to (null for a global cart). */
  couponPodId: string | null;
  /** Side effect run just before the success screen (e.g. clear the cart pod). */
  onBeforeSuccess?: (payment: any) => void;
  /** Whether to use the delivery-flavoured schema; both schemas require billing. */
  requireAddress?: boolean;
}

/**
 * Shared checkout session — the pieces the pod-membership checkout and the
 * standalone product checkout have in common: finance/profile queries, the RHF +
 * Zod form with its prefill, coupon preview state, best-effort main-address
 * persistence and the Razorpay verification. Each page keeps its own summary,
 * amount maths and pay mutations. Amount-dependent bits (coupon preview) take the
 * amount as an argument so either page can drive them.
 */
export function useCheckoutSession({ couponPodId, onBeforeSuccess, requireAddress = false }: Args) {
  const { t } = useTranslation();
  const { data: financeData, loading: financeLoading } = useQuery<any>(PUBLIC_FINANCE);
  const { data: meData, loading: meLoading } = useQuery<any>(CHECKOUT_ME, { fetchPolicy: 'cache-and-network' });
  const { data: couponsData } = useQuery<any>(AVAILABLE_COUPONS, {
    variables: { pod_id: couponPodId || null },
    fetchPolicy: 'cache-and-network',
  });
  // The loyalty balance a buyer may spend on this bill. Read here so both the
  // pod and the product checkout share one source of truth.
  const { data: coinData } = useQuery<any>(MY_COIN_BALANCE, { fetchPolicy: 'cache-and-network' });
  const [doVerifyRazorpay] = useMutation<any>(VERIFY_RAZORPAY_PAYMENT);
  const [doUpdateProfile] = useMutation<any>(UPDATE_MY_PROFILE);
  const [runPreviewCoupon] = useLazyQuery<any>(PREVIEW_COUPON, { fetchPolicy: 'no-cache' });
  // Every poll must reach the server — a cached answer would report the status
  // we already know is stale.
  const [runMyPayment] = useLazyQuery<any>(MY_PAYMENT, { fetchPolicy: 'no-cache' });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [coinsApplied, setCoinsApplied] = useState(0);
  const [pickedContact, setPickedContact] = useState<PickedContact | null>(null);
  // Set only while the verify call has died and the payment is being read back
  // from the server. It is progress, never a failure — the buyer's money has
  // already moved and nothing has gone wrong yet.
  const [confirmingMessage, setConfirmingMessage] = useState<string | null>(null);

  // The schemas cannot call `t` at module scope, so they are built here from the
  // reader's own catalogue — the validation messages are copy like any other.
  const schema = useMemo(
    () => (requireAddress ? makeProductCheckoutSchema(t) : makeCheckoutSchema(t)),
    [requireAddress, t],
  );

  const { control, handleSubmit, getValues, reset } = useForm<CheckoutForm, any, CheckoutForm>({
    defaultValues: checkoutDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<CheckoutForm, any, CheckoutForm>,
    mode: 'onTouched',
  });

  const finance = financeData?.publicFinanceSettings;
  const me = meData?.me;
  const mainAddress = me?.address ?? null;
  const hasMainAddress = !!mainAddress?.line1?.trim();
  const meContact: CheckoutContact | null = me
    ? {
        fullName: [me.first_name, me.last_name].filter(Boolean).join(' ').trim(),
        email: me.email ?? '',
        phoneExtension: me.phone_extension ?? '',
        phoneNumber: me.phone_number ?? '',
      }
    : null;

  const finishSuccess = (payment: any) => {
    onBeforeSuccess?.(payment);
    setSuccess(payment);
  };

  const applyCoupon = async (amount: number, codeArg?: string) => {
    const code = (codeArg ?? couponCode).trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await runPreviewCoupon({
        variables: { input: { code, pod_id: couponPodId || null, amount } },
      });
      const preview = res.data?.previewCoupon as CouponPreview | undefined;
      if (preview?.ok) setCoupon(preview);
      else {
        setCoupon(null);
        setCouponError(preview?.message ?? t('mweb.checkout.errorCouponInvalid'));
      }
    } catch (e: any) {
      setCoupon(null);
      setCouponError(parseApiError(e));
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const removeCoins = () => setCoinsApplied(0);

  // Fill the billing/delivery fields from a picked saved address (SavedAddressPicker).
  // The address book carries its own parcel contact (name/phone/email), which is
  // what a delivery should reach — the profile contact may have no phone at all.
  const pickAddress = (picked: UserAddress) => {
    setPickedContact({
      name: picked.name?.trim() ?? '',
      phone: picked.phone?.trim() ?? '',
      email: picked.email?.trim() ?? '',
    });
    reset({
      ...getValues(),
      same_as_main: false,
      full_name: picked.name || getValues().full_name,
      line1: picked.line1,
      line2: picked.line2,
      landmark: picked.landmark,
      city: picked.city,
      state: picked.state,
      pincode: picked.pincode,
      country: picked.country || 'India',
    });
  };

  // Best-effort: persist the entered billing address as the main address when the
  // buyer opts in. Never blocks or fails checkout if the profile save errors.
  const persistMainAddress = async (values: CheckoutForm) => {
    if (!shouldPersistMainAddress(values, hasMainAddress)) return;
    try {
      await doUpdateProfile({ variables: { input: { address: resolveBillingAddress(values, null) } } });
    } catch {
      // Saving the main address is best-effort — ignore so payment still proceeds.
    }
  };

  /** The buyer's own payment row, read back by id. Keep MY_PAYMENT's selection
   * to the fields the confirmation screen renders and NOTHING else; `Payment.pod`
   * in particular resolves a findById per row. */
  const readMyPayment = async (paymentDocId: string): Promise<CheckoutPaymentRow | null> => {
    const res = await runMyPayment({ variables: { id: paymentDocId } });
    return (res.data?.myPayment ?? null) as CheckoutPaymentRow | null;
  };

  /**
   * The verify call died in transport, so the server may well have booked the
   * spot the buyer has already paid for. Ask it what happened rather than
   * reporting a failure we cannot stand behind, and only give up — calmly, and
   * without the words "timeout" or "network" — once it still cannot tell us.
   */
  const confirmAfterTransportFailure = async (paymentDocId: string) => {
    setConfirmingMessage(t('mweb.checkout.confirmingPayment'));
    try {
      const payment = await confirmPaymentAfterTransportFailure({
        fetchStatus: () => readMyPayment(paymentDocId),
      });
      // The poll settles on whatever the server says, which includes a payment
      // that genuinely FAILED or was REFUNDED. Each ending gets its own honest
      // line; only a still-unknown one gets the "wait for your booking" copy.
      const confirmed = classifyConfirmedPayment(payment);
      if (confirmed.outcome === 'SUCCESS') finishSuccess(confirmed.payment);
      else setError(t(confirmed.messageKey));
    } finally {
      setConfirmingMessage(null);
    }
  };

  const verifyRazorpay = async (paymentDocId: string, sig: RazorpaySignature) => {
    setSubmitting(true);
    try {
      const res = await doVerifyRazorpay({ variables: { input: { payment_doc_id: paymentDocId, ...sig } } });
      const payment = res.data?.verifyRazorpayPayment;
      if (payment?.status === 'SUCCESS') finishSuccess(payment);
      else setError(t('mweb.checkout.errorNotVerified'));
    } catch (e: any) {
      // A transport failure says nothing about the payment — only about the
      // request. `submitting` stays true throughout, so the buyer keeps seeing
      // the processing overlay instead of a network error.
      if (isTransportError(e)) await confirmAfterTransportFailure(paymentDocId);
      else setError(parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!me) return;
    const prev = getValues();
    const addr = me.address ?? {};
    const savedMainAddress = !!addr.line1?.trim();
    const fullName = [me.first_name, me.last_name].filter(Boolean).join(' ').trim();
    reset({
      ...prev,
      full_name: prev.full_name || fullName,
      email: prev.email || me.email || '',
      phone_extension: prev.phone_extension || me.phone_extension || '+91',
      phone_number: prev.phone_number || me.phone_number || '',
      same_as_main: savedMainAddress,
      line1: prev.line1 || addr.line1 || '',
      line2: prev.line2 || addr.line2 || '',
      landmark: prev.landmark || addr.landmark || '',
      city: prev.city || addr.city || '',
      state: prev.state || addr.state || '',
      pincode: prev.pincode || addr.pincode || '',
      country: prev.country || addr.country || 'India',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meData]);

  // Preload the Razorpay SDK as soon as we know it's the live gateway, so there's
  // no script-fetch delay after the user presses Pay.
  const razorpayLive = !!finance?.razorpay_enabled;
  useEffect(() => {
    if (razorpayLive) loadRazorpay().catch(() => undefined);
  }, [razorpayLive]);

  return {
    finance,
    financeLoading,
    meLoading,
    me,
    mainAddress,
    hasMainAddress,
    meContact,
    control,
    handleSubmit,
    getValues,
    reset,
    submitting,
    setSubmitting,
    confirmingMessage,
    error,
    setError,
    success,
    finishSuccess,
    coupon,
    couponCode,
    setCouponCode,
    couponError,
    applyingCoupon,
    applyCoupon,
    removeCoupon,
    coinBalance: coinData?.myCoinBalance?.balance ?? 0,
    // The live earn rates, so a checkout can preview what the purchase pays
    // back. Pod tickets and shop orders earn at separately configured rates.
    coinEarnPct: coinData?.myCoinBalance?.earn_pct ?? 0,
    coinShopEarnPct: coinData?.myCoinBalance?.shop_earn_pct ?? 0,
    coinsApplied,
    setCoinsApplied,
    removeCoins,
    pickAddress,
    pickedContact,
    availableCoupons: couponsData?.availableCouponsForPod ?? [],
    persistMainAddress,
    verifyRazorpay,
  };
}

export type CheckoutSession = ReturnType<typeof useCheckoutSession>;
