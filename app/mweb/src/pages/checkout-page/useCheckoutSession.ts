import { useEffect, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  checkoutSchema,
  checkoutDefaults,
  resolveBillingAddress,
  shouldPersistMainAddress,
} from './checkout';
import {
  AVAILABLE_COUPONS,
  CHECKOUT_ME,
  PREVIEW_COUPON,
  PUBLIC_FINANCE,
  UPDATE_MY_PROFILE,
  VERIFY_RAZORPAY_PAYMENT,
  type CheckoutContact,
  type CheckoutForm,
  type CouponPreview,
} from './queries';
import { loadRazorpay, type RazorpaySignature } from './razorpayCheckout';
import { parseApiError } from '../../utils/parseApiError';
import type { UserAddress } from '../account-page/address-book-form';

interface Args {
  /** Pod the coupons/preview are scoped to (null for a global cart). */
  couponPodId: string | null;
  /** Side effect run just before the success screen (e.g. clear the cart pod). */
  onBeforeSuccess?: (payment: any) => void;
}

/**
 * Shared checkout session — the pieces the pod-membership checkout and the
 * standalone product checkout have in common: finance/profile queries, the RHF +
 * Zod form with its prefill, coupon preview state, best-effort main-address
 * persistence and the Razorpay verification. Each page keeps its own summary,
 * amount maths and pay mutations. Amount-dependent bits (coupon preview) take the
 * amount as an argument so either page can drive them.
 */
export function useCheckoutSession({ couponPodId, onBeforeSuccess }: Args) {
  const { data: financeData, loading: financeLoading } = useQuery(PUBLIC_FINANCE);
  const { data: meData, loading: meLoading } = useQuery(CHECKOUT_ME, { fetchPolicy: 'cache-and-network' });
  const { data: couponsData } = useQuery(AVAILABLE_COUPONS, {
    variables: { pod_id: couponPodId || null },
    fetchPolicy: 'cache-and-network',
  });
  const [doVerifyRazorpay] = useMutation(VERIFY_RAZORPAY_PAYMENT);
  const [doUpdateProfile] = useMutation(UPDATE_MY_PROFILE);
  const [runPreviewCoupon] = useLazyQuery(PREVIEW_COUPON, { fetchPolicy: 'no-cache' });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const { control, handleSubmit, getValues, reset } = useForm<CheckoutForm>({
    defaultValues: checkoutDefaults,
    resolver: zodResolver(checkoutSchema),
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
        setCouponError(preview?.message ?? 'Invalid coupon code');
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

  // Fill the billing/delivery fields from a picked saved address (SavedAddressPicker).
  const pickAddress = (picked: UserAddress) =>
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

  const verifyRazorpay = async (paymentDocId: string, sig: RazorpaySignature) => {
    setSubmitting(true);
    try {
      const res = await doVerifyRazorpay({ variables: { input: { payment_doc_id: paymentDocId, ...sig } } });
      const payment = res.data?.verifyRazorpayPayment;
      if (payment?.status === 'SUCCESS') finishSuccess(payment);
      else setError('Payment could not be verified.');
    } catch (e: any) {
      setError(parseApiError(e));
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
    pickAddress,
    availableCoupons: couponsData?.availableCouponsForPod ?? [],
    persistMainAddress,
    verifyRazorpay,
  };
}

export type CheckoutSession = ReturnType<typeof useCheckoutSession>;
