import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Backdrop, Box, Button, Chip, IconButton, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import PaymentLottie from '../../components/PaymentLottie';
import {
  checkoutSchema,
  checkoutDefaults,
  toCheckoutContact,
  toCheckoutBilling,
  resolveBillingAddress,
  shouldPersistMainAddress,
} from './checkout';
import { buildBreakup } from './checkoutMath';
import CheckoutSuccess from './CheckoutSuccess';
import OrderSummaryCard from './OrderSummaryCard';
import PaymentDetailsCard from './PaymentDetailsCard';
import SavedAddressPicker from './SavedAddressPicker';
import {
  AVAILABLE_COUPONS,
  CHECKOUT_ME,
  CHECKOUT_POD,
  CREATE_RAZORPAY_ORDER,
  DUMMY_CHECKOUT,
  PREVIEW_COUPON,
  PUBLIC_FINANCE,
  UPDATE_MY_PROFILE,
  VERIFY_RAZORPAY_PAYMENT,
  type CheckoutContact,
  type CheckoutForm,
  type CheckoutState,
  type CouponPreview,
} from './queries';
import {
  loadRazorpay,
  openRazorpayCheckout,
  type RazorpayOrderData,
  type RazorpaySignature,
} from './razorpayCheckout';
import { parseApiError } from '../../utils/parseApiError';
import { useCart } from '../../components/cart/CartContext';

/** The active payment-gateway badge — Razorpay when live, else Dummy when on. */
function GatewayChip({ finance, isDark, theme }: Readonly<{ finance: any; isDark: boolean; theme: Theme }>) {
  if (finance?.razorpay_enabled) {
    return (
      <Chip size="small" label="Razorpay" sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.14)' : alpha(theme.palette.primary.main, 0.12), color: 'text.primary', fontWeight: 800 }} />
    );
  }
  if (finance?.dummy_mode) {
    return (
      <Chip size="small" label="Dummy" sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.14)' : alpha(theme.palette.text.primary, 0.08), color: 'text.primary', fontWeight: 800 }} />
    );
  }
  return null;
}

export default function CheckoutPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { podId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as CheckoutState;
  const search = new URLSearchParams(location.search);
  const checkoutPodId = podId || state.pod_id || search.get('pod_id') || '';

  const { data: financeData, loading: financeLoading } = useQuery(PUBLIC_FINANCE);
  const { data: meData, loading: meLoading } = useQuery(CHECKOUT_ME, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: podData, loading: podLoading, error: podError } = useQuery(CHECKOUT_POD, {
    variables: { id: checkoutPodId },
    skip: !checkoutPodId,
    fetchPolicy: 'cache-and-network',
  });
  const [doCheckout] = useMutation(DUMMY_CHECKOUT);
  const [doRazorpayOrder] = useMutation(CREATE_RAZORPAY_ORDER);
  const [doVerifyRazorpay] = useMutation(VERIFY_RAZORPAY_PAYMENT);
  const [doUpdateProfile] = useMutation(UPDATE_MY_PROFILE);
  const [runPreviewCoupon] = useLazyQuery(PREVIEW_COUPON, { fetchPolicy: 'no-cache' });
  const { data: couponsData } = useQuery(AVAILABLE_COUPONS, {
    variables: { pod_id: checkoutPodId || null },
    fetchPolicy: 'cache-and-network',
  });
  const { clearPod } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);
  // A successful payment consumes this pod's cart lines.
  const finishSuccess = (payment: any) => {
    if (checkoutPodId) clearPod(checkoutPodId);
    setSuccess(payment);
  };
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const applyCoupon = async (codeArg?: string) => {
    const code = (codeArg ?? couponCode).trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await runPreviewCoupon({
        variables: { input: { code, pod_id: checkoutPodId || null, amount } },
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

  const verifyRazorpay = async (paymentDocId: string, sig: RazorpaySignature) => {
    setSubmitting(true);
    try {
      const res = await doVerifyRazorpay({
        variables: { input: { payment_doc_id: paymentDocId, ...sig } },
      });
      const payment = res.data?.verifyRazorpayPayment;
      if (payment?.status === 'SUCCESS') finishSuccess(payment);
      else setError('Payment could not be verified.');
    } catch (e: any) {
      setError(parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const { control, handleSubmit, getValues, reset } = useForm<CheckoutForm>({
    defaultValues: checkoutDefaults,
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
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

  const onCheckout = async (values: CheckoutForm) => {
    setError(null);
    setSubmitting(true);
    const finance = financeData?.publicFinanceSettings;
    const title = pod?.pod_title || state.pod_title || search.get('title') || 'Booking';
    const { simulate_failure, ...contact } = toCheckoutContact(values);
    const billing = toCheckoutBilling(values, meData?.me?.address);
    const input = {
      pod_id: checkoutPodId || null,
      amount,
      // Strip client-only fields (unit_cost) and pass the chosen variant.
      selected_products: selectedProducts.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        ...(item.variant_id ? { variant_id: item.variant_id } : {}),
      })),
      description: state.description || `Pod booking · ${title}`,
      ...contact,
      billing,
      // Shipped products deliver to the billing address the buyer entered here
      // (the server rejects SHIP-bound products without one).
      shipping_address: {
        name: values.full_name,
        phone: `${values.phone_extension} ${values.phone_number}`.trim(),
        email: values.email,
        line1: values.line1,
        line2: values.line2 || '',
        landmark: values.landmark || '',
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        country: values.country || 'India',
      },
      checkout_url: globalThis.window.location.href,
      coupon_code: coupon?.ok ? coupon.code : null,
    };
    await persistMainAddress(values);
    try {
      // Razorpay is the live gateway and takes precedence whenever its keys are
      // configured in the Tech portal. The dummy gateway is only a local fallback.
      if (finance?.razorpay_enabled) {
        const orderRes = await doRazorpayOrder({ variables: { input } });
        const order = orderRes.data?.createRazorpayOrder;
        if (!order) {
          setError('Could not start the payment. Please try again.');
          return;
        }
        // 100%-off coupon → already completed server-side, no gateway sheet.
        if (order.free && order.payment) {
          finishSuccess(order.payment);
          return;
        }
        setSubmitting(false);
        await openRazorpayCheckout(order as RazorpayOrderData, {
          onSuccess: (sig) => verifyRazorpay(order.payment_doc_id, sig),
          onDismiss: () => setError('Payment was cancelled.'),
        });
        return;
      }
      if (finance?.dummy_mode) {
        const res = await doCheckout({ variables: { input: { ...input, simulate_failure } } });
        const payment = res.data?.dummyCheckout;
        if (payment?.status === 'SUCCESS') finishSuccess(payment);
        else setError('Payment failed. Please try again.');
        return;
      }
      setError('Online payments are not configured yet. Please try again later.');
    } catch (submitError: any) {
      setError(parseApiError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = handleSubmit(onCheckout);

  // Preload the Razorpay checkout SDK as soon as we know it's the live gateway,
  // so there's no script-fetch delay after the user presses Pay (B2-#2).
  const razorpayLive = !!financeData?.publicFinanceSettings?.razorpay_enabled;
  useEffect(() => {
    if (razorpayLive) loadRazorpay().catch(() => undefined);
  }, [razorpayLive]);

  useEffect(() => {
    const me = meData?.me;
    if (!me) return;
    const prev = getValues();
    const addr = me.address ?? {};
    const hasMainAddress = !!addr.line1?.trim();
    const fullName = [me.first_name, me.last_name].filter(Boolean).join(' ').trim();
    reset({
      ...prev,
      full_name: prev.full_name || fullName,
      email: prev.email || me.email || '',
      phone_extension: prev.phone_extension || me.phone_extension || '+91',
      phone_number: prev.phone_number || me.phone_number || '',
      same_as_main: hasMainAddress,
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

  const pod = podData?.pod;
  const me = meData?.me;
  const mainAddress = me?.address ?? null;
  const hasMainAddress = !!mainAddress?.line1?.trim();
  // Resolve the buyer's contact straight from the loaded `me` query so the
  // read-only card never depends on the prefill reset → useWatch timing.
  const meContact: CheckoutContact | null = me
    ? {
        fullName: [me.first_name, me.last_name].filter(Boolean).join(' ').trim(),
        email: me.email ?? '',
        phoneExtension: me.phone_extension ?? '',
        phoneNumber: me.phone_number ?? '',
      }
    : null;
  const selectedProducts = state.selected_products ?? [];
  const baseAmount = Number(pod?.pod_amount ?? state.amount ?? search.get('amount') ?? 0);
  const productAmount = selectedProducts.reduce((sum, item: any) => {
    const product = (pod?.product_requests ?? []).find((entry: any) => entry.product_id === item.product_id);
    // Variant lines carry their own price; base lines use the pod snapshot.
    return sum + Number(item.unit_cost ?? product?.unit_cost ?? 0) * Number(item.quantity || 0);
  }, 0);
  const amount = baseAmount + productAmount;
  const breakup = useMemo(
    () => buildBreakup(amount, financeData?.publicFinanceSettings),
    [amount, financeData]
  );

  if (success) return <CheckoutSuccess payment={success} pod={pod} onHome={() => navigate('/')} onProfile={() => navigate('/profile')} />;

  if (!checkoutPodId && !state.amount) {
    return <EmptyCheckout onHome={() => navigate('/')} />;
  }

  if (financeLoading || podLoading || !breakup) return <CheckoutSkeleton />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', pb: 'calc(var(--duncit-bottom-nav-height, 72px) + env(safe-area-inset-bottom) + 24px)' }}>
      <Box sx={{ p: 2, borderRadius: 4, color: 'text.primary', background: isDark ? 'linear-gradient(145deg, #15111c 0%, #2a1926 58%, #111827 100%)' : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.primary.light, 0.18)} 58%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`, boxShadow: isDark ? '0 18px 44px rgba(17, 24, 39, 0.22)' : `0 18px 44px ${alpha(theme.palette.primary.dark, 0.12)}`, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ color: 'text.primary', bgcolor: isDark ? 'rgba(255,255,255,0.12)' : alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.18)' : alpha(theme.palette.primary.main, 0.16) } }}><ArrowBackIcon /></IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>Checkout</Typography>
          <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1 }}>Confirm your spot</Typography>
        </Box>
        <GatewayChip finance={financeData?.publicFinanceSettings} isDark={isDark} theme={theme} />
      </Stack>
      {podError && <Alert severity="error" sx={{ mb: 2 }}>{podError.message}</Alert>}
      <SavedAddressPicker
        onPick={(picked) =>
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
          })
        }
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <OrderSummaryCard pod={pod} stateTitle={state.pod_title || search.get('title') || ''} breakup={breakup} selectedProducts={selectedProducts} />
        <PaymentDetailsCard
          control={control}
          onSubmit={submit}
          error={error}
          submitting={submitting}
          total={breakup.total}
          effectiveTotal={coupon?.ok ? coupon.final_total : breakup.total}
          currency={breakup.currency}
          dummyMode={
            !!financeData?.publicFinanceSettings?.dummy_mode &&
            !financeData?.publicFinanceSettings?.razorpay_enabled
          }
          mainAddress={mainAddress}
          hasMainAddress={hasMainAddress}
          contact={meContact}
          contactLoading={meLoading && !me}
          coupon={coupon}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          couponError={couponError}
          applyingCoupon={applyingCoupon}
          availableCoupons={couponsData?.availableCouponsForPod ?? []}
          onApplyCoupon={applyCoupon}
          onRemoveCoupon={removeCoupon}
        />
      </Stack>
      </Box>
      <Backdrop open={submitting} sx={{ zIndex: (t) => t.zIndex.modal + 1, bgcolor: 'rgba(3,7,18,0.72)', backdropFilter: 'blur(8px)', p: 2 }}>
        <Box sx={{ width: 'min(360px, calc(100vw - 32px))', px: 3, py: 3, borderRadius: 4, textAlign: 'center', color: '#fff', bgcolor: 'rgba(17,24,39,0.92)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 24px 70px rgba(0,0,0,0.42)' }}>
          <PaymentLottie variant="processing" size={118} />
          <Typography variant="subtitle1" fontWeight={900}>Processing your payment...</Typography>
          <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: 'rgba(255,255,255,0.74)' }}>Please don't close this tab.</Typography>
        </Box>
      </Backdrop>
    </Box>
  );
}

function EmptyCheckout({ onHome }: Readonly<{ onHome: () => void }>) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Alert severity="info" sx={{ mb: 2 }}>Nothing to checkout.</Alert>
      <Button onClick={onHome} variant="contained">Back to Home</Button>
    </Box>
  );
}

function CheckoutSkeleton() {
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      <Stack spacing={2}>
        <Skeleton variant="text" width="40%" height={40} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Skeleton variant="rounded" height={260} sx={{ flex: 1 }} />
          <Skeleton variant="rounded" height={420} sx={{ flex: 1 }} />
        </Stack>
      </Stack>
    </Box>
  );
}
