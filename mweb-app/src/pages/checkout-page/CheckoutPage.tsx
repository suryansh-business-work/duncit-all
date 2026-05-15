import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { useFormik } from 'formik';
import { Alert, Backdrop, Box, Button, Chip, CircularProgress, IconButton, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentLottie from '../../components/PaymentLottie';
import { checkoutFormSchema, checkoutInitialValues, toCheckoutContact } from './checkout.form';
import { buildBreakup } from './checkoutMath';
import CheckoutSuccess from './CheckoutSuccess';
import OrderSummaryCard from './OrderSummaryCard';
import PaymentDetailsCard from './PaymentDetailsCard';
import { CHECKOUT_ME, CHECKOUT_POD, DUMMY_CHECKOUT, PUBLIC_FINANCE, type CheckoutState } from './queries';

export default function CheckoutPage() {
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
        setError(submitError?.errors?.join(', ') || submitError.message || 'Checkout failed');
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
      phone: prev.phone || `${me.phone_extension || ''}${me.phone_number || ''}`,
    }), false);
  }, [meData]);

  const pod = podData?.pod;
  const amount = Number(pod?.pod_amount ?? state.amount ?? search.get('amount') ?? 0);
  const breakup = useMemo(
    () => buildBreakup(amount, financeData?.publicFinanceSettings),
    [amount, financeData]
  );

  if (success) return <CheckoutSuccess payment={success} onHome={() => navigate('/')} onProfile={() => navigate('/profile')} />;

  if (!checkoutPodId && !state.amount) {
    return <EmptyCheckout onHome={() => navigate('/')} />;
  }

  if (financeLoading || podLoading || !breakup) return <CheckoutSkeleton />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', pb: 'calc(var(--duncit-bottom-nav-height, 72px) + env(safe-area-inset-bottom) + 24px)' }}>
      <Box sx={{ p: 2, borderRadius: 4, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 58%, #111827 100%)', boxShadow: '0 18px 44px rgba(17, 24, 39, 0.22)' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' }}><ArrowBackIcon /></IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: 0, lineHeight: 1 }}>Checkout</Typography>
          <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1 }}>Confirm your spot</Typography>
        </Box>
        {financeData?.publicFinanceSettings?.dummy_mode && <Chip size="small" label="Dummy" sx={{ bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', fontWeight: 800 }} />}
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
      <Backdrop open={submitting} sx={{ color: 'common.white', zIndex: (t) => t.zIndex.modal + 1, flexDirection: 'column', gap: 2 }}>
        <PaymentLottie variant="processing" size={140} />
        <Typography variant="subtitle1" fontWeight={600}>Processing your payment...</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>Please don't close this tab.</Typography>
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
