import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useFormik } from 'formik';
import { Alert, Backdrop, Box, Button, Chip, IconButton, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { alpha, useTheme } from '@mui/material/styles';
import PaymentLottie from '../../components/PaymentLottie';
import { checkoutFormSchema, checkoutInitialValues, toCheckoutContact } from './checkout.form';
import { buildBreakup } from './checkoutMath';
import CheckoutSuccess from './CheckoutSuccess';
import OrderSummaryCard from './OrderSummaryCard';
import PaymentDetailsCard from './PaymentDetailsCard';
import { CHECKOUT_ME, CHECKOUT_POD, DUMMY_CHECKOUT, PUBLIC_FINANCE, type CheckoutState } from './queries';
import { parseApiError } from '../../utils/parseApiError';

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
  const { data: meData } = useQuery(CHECKOUT_ME);
  const { data: podData, loading: podLoading, error: podError } = useQuery(CHECKOUT_POD, {
    variables: { id: checkoutPodId },
    skip: !checkoutPodId,
    fetchPolicy: 'cache-and-network',
  });
  const [doCheckout] = useMutation(DUMMY_CHECKOUT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const formik = useFormik({
    initialValues: checkoutInitialValues,
    validationSchema: checkoutFormSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values) => {
      setError(null);
      setSubmitting(true);
      try {
        const title = pod?.pod_title || state.pod_title || search.get('title') || 'Booking';
        const contact = toCheckoutContact(values);
        const res = await doCheckout({
          variables: {
            input: {
              pod_id: checkoutPodId || null,
              amount,
              description: state.description || `Pod booking · ${title}`,
              ...contact,
              checkout_url: window.location.href,
            },
          },
        });
        const payment = res.data?.dummyCheckout;
        if (payment?.status === 'SUCCESS') setSuccess(payment);
        else setError('Payment failed. Please try again.');
      } catch (submitError: any) {
        setError(parseApiError(submitError));
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const me = meData?.me;
    if (!me) return;
    formik.setValues((prev) => ({
      ...prev,
      email: prev.email || me.email || '',
      phone_extension: prev.phone_extension || me.phone_extension || '+91',
      phone_number: prev.phone_number || me.phone_number || '',
    }), false);
  }, [meData]);

  const pod = podData?.pod;
  const amount = Number(pod?.pod_amount ?? state.amount ?? search.get('amount') ?? 0);
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
        {financeData?.publicFinanceSettings?.dummy_mode && <Chip size="small" label="Dummy" sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.14)' : alpha(theme.palette.text.primary, 0.08), color: 'text.primary', fontWeight: 800 }} />}
      </Stack>
      {podError && <Alert severity="error" sx={{ mb: 2 }}>{podError.message}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <OrderSummaryCard pod={pod} stateTitle={state.pod_title || search.get('title') || ''} breakup={breakup} />
        <PaymentDetailsCard
          formik={formik}
          error={error}
          submitting={submitting}
          total={breakup.total}
          currency={breakup.currency}
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

function EmptyCheckout({ onHome }: { onHome: () => void }) {
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
