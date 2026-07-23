import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, IconButton, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { alpha, useTheme } from '@mui/material/styles';
import { toCheckoutContact, toCheckoutBilling } from './checkout';
import { buildBreakup } from './checkoutMath';
import CheckoutSuccess from './CheckoutSuccess';
import GatewayChip from './GatewayChip';
import OrderSummaryCard from './OrderSummaryCard';
import PaymentDetailsCard from './PaymentDetailsCard';
import ProcessingBackdrop from './ProcessingBackdrop';
import SavedAddressPicker from './SavedAddressPicker';
import {
  CHECKOUT_POD,
  CREATE_RAZORPAY_ORDER,
  DUMMY_CHECKOUT,
  type CheckoutForm,
  type CheckoutState,
} from './queries';
import { openRazorpayCheckout, type RazorpayOrderData, type RazorpaySignature } from './razorpayCheckout';
import { parseApiError } from '../../utils/parseApiError';
import { useCheckoutSession } from './useCheckoutSession';

export default function CheckoutPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { podId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as CheckoutState;
  const search = new URLSearchParams(location.search);
  const checkoutPodId = podId || state.pod_id || search.get('pod_id') || '';

  const { data: podData, loading: podLoading, error: podError } = useQuery(CHECKOUT_POD, {
    variables: { id: checkoutPodId },
    skip: !checkoutPodId,
    fetchPolicy: 'cache-and-network',
  });
  const [doCheckout] = useMutation(DUMMY_CHECKOUT);
  const [doRazorpayOrder] = useMutation(CREATE_RAZORPAY_ORDER);

  const session = useCheckoutSession({ couponPodId: checkoutPodId || null });

  const pod = podData?.pod;
  // Pod checkout pays the membership (pod_amount) ONLY — products are a separate
  // payment through the standalone product checkout. Never mix the two.
  const amount = Number(pod?.pod_amount ?? state.amount ?? search.get('amount') ?? 0);
  const breakup = useMemo(() => buildBreakup(amount, session.finance), [amount, session.finance]);

  const onCheckout = async (values: CheckoutForm) => {
    session.setError(null);
    session.setSubmitting(true);
    const finance = session.finance;
    const title = pod?.pod_title || state.pod_title || search.get('title') || 'Booking';
    const { simulate_failure, ...contact } = toCheckoutContact(values);
    const billing = toCheckoutBilling(values, session.me?.address);
    const input = {
      pod_id: checkoutPodId || null,
      amount,
      description: state.description || `Pod booking · ${title}`,
      ...contact,
      billing,
      checkout_url: globalThis.window.location.href,
      coupon_code: session.coupon?.ok ? session.coupon.code : null,
    };
    await session.persistMainAddress(values);
    try {
      if (finance?.razorpay_enabled) {
        const orderRes = await doRazorpayOrder({ variables: { input } });
        const order = orderRes.data?.createRazorpayOrder;
        if (!order) {
          session.setError('Could not start the payment. Please try again.');
          return;
        }
        if (order.free && order.payment) {
          session.finishSuccess(order.payment);
          return;
        }
        session.setSubmitting(false);
        await openRazorpayCheckout(order as RazorpayOrderData, {
          onSuccess: (sig: RazorpaySignature) => session.verifyRazorpay(order.payment_doc_id, sig),
          onDismiss: () => session.setError('Payment was cancelled.'),
        });
        return;
      }
      if (finance?.dummy_mode) {
        const res = await doCheckout({ variables: { input: { ...input, simulate_failure } } });
        const payment = res.data?.dummyCheckout;
        if (payment?.status === 'SUCCESS') session.finishSuccess(payment);
        else session.setError('Payment failed. Please try again.');
        return;
      }
      session.setError('Online payments are not configured yet. Please try again later.');
    } catch (submitError: any) {
      session.setError(parseApiError(submitError));
    } finally {
      session.setSubmitting(false);
    }
  };

  const submit = session.handleSubmit(onCheckout);

  if (session.success) {
    return (
      <CheckoutSuccess
        payment={session.success}
        pod={pod}
        onHome={() => navigate('/')}
        onProfile={() => navigate('/profile')}
      />
    );
  }

  if (!checkoutPodId && !state.amount) return <EmptyCheckout onHome={() => navigate('/')} />;
  if (session.financeLoading || podLoading || !breakup) return <CheckoutSkeleton />;

  const headerBg = isDark
    ? 'linear-gradient(145deg, #15111c 0%, #2a1926 58%, #111827 100%)'
    : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.primary.light, 0.18)} 58%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', pb: 'calc(var(--duncit-bottom-nav-height, 72px) + env(safe-area-inset-bottom) + 24px)' }}>
      <Box sx={{ p: 2, borderRadius: 4, color: 'text.primary', background: headerBg, boxShadow: isDark ? '0 18px 44px rgba(17, 24, 39, 0.22)' : `0 18px 44px ${alpha(theme.palette.primary.dark, 0.12)}`, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ color: 'text.primary', bgcolor: isDark ? 'rgba(255,255,255,0.12)' : alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.18)' : alpha(theme.palette.primary.main, 0.16) } }}><ArrowBackIcon /></IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0, lineHeight: 1 }}>Checkout</Typography>
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1 }}>Confirm your spot</Typography>
          </Box>
          <GatewayChip finance={session.finance} />
        </Stack>
        {podError && <Alert severity="error" sx={{ mb: 2 }}>{podError.message}</Alert>}
        <SavedAddressPicker onPick={session.pickAddress} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <OrderSummaryCard pod={pod} stateTitle={state.pod_title || search.get('title') || ''} breakup={breakup} />
          <PaymentDetailsCard
            control={session.control}
            onSubmit={submit}
            error={session.error}
            submitting={session.submitting}
            total={breakup.total}
            effectiveTotal={session.coupon?.ok ? session.coupon.final_total : breakup.total}
            currency={breakup.currency}
            dummyMode={!!session.finance?.dummy_mode && !session.finance?.razorpay_enabled}
            mainAddress={session.mainAddress}
            hasMainAddress={session.hasMainAddress}
            contact={session.meContact}
            contactLoading={session.meLoading && !session.me}
            coupon={session.coupon}
            couponCode={session.couponCode}
            setCouponCode={session.setCouponCode}
            couponError={session.couponError}
            applyingCoupon={session.applyingCoupon}
            availableCoupons={session.availableCoupons}
            onApplyCoupon={(code) => session.applyCoupon(amount, code)}
            onRemoveCoupon={session.removeCoupon}
          />
        </Stack>
      </Box>
      <ProcessingBackdrop open={session.submitting} />
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
