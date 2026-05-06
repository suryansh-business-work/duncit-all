import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const PUBLIC_FINANCE = gql`
  query PublicFinanceSettings {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      dummy_mode
    }
  }
`;

const ME = gql`
  query CheckoutMe {
    me {
      id
      first_name
      last_name
      email
      phone_number
    }
  }
`;

const DUMMY_CHECKOUT = gql`
  mutation DummyCheckout($input: DummyCheckoutInput!) {
    dummyCheckout(input: $input) {
      id
      payment_id
      invoice_no
      total
      currency_symbol
      status
    }
  }
`;

interface CheckoutState {
  pod_id?: string;
  pod_title?: string;
  amount?: number;
  description?: string;
}

const PAYMENT_METHODS = [
  { value: 'DUMMY_UPI', label: 'UPI (Dummy)' },
  { value: 'DUMMY_CARD', label: 'Credit / Debit Card (Dummy)' },
  { value: 'DUMMY_NETBANKING', label: 'Net Banking (Dummy)' },
];

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as CheckoutState;

  const { data: financeData, loading: financeLoading } = useQuery(PUBLIC_FINANCE);
  const { data: meData } = useQuery(ME);

  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('DUMMY_UPI');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const [doCheckout] = useMutation(DUMMY_CHECKOUT);

  useEffect(() => {
    if (meData?.me?.phone_number) setPhone(meData.me.phone_number);
  }, [meData]);

  const fs = financeData?.publicFinanceSettings;
  const amount = Number(state.amount) || 0;

  const breakup = useMemo(() => {
    if (!fs) return null;
    const gross = amount;
    const f = fs.platform_fee_pct / 100;
    const g = fs.gst_pct / 100;
    const divisor = (1 + f) * (1 + g);
    const subtotal = divisor > 0 ? gross / divisor : gross;
    const fee = subtotal * f;
    const gst = (subtotal + fee) * g;
    return {
      subtotal,
      fee,
      gst,
      total: gross,
      currency: fs.currency_symbol,
      feePct: fs.platform_fee_pct,
      gstPct: fs.gst_pct,
    };
  }, [fs, amount]);

  if (!state.amount && !success) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info" sx={{ mb: 2 }}>Nothing to checkout.</Alert>
        <Button onClick={() => navigate('/')} variant="contained">
          Back to Home
        </Button>
      </Box>
    );
  }

  if (financeLoading || !breakup) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (success) {
    const fmt = (n: number) => `${success.currency_symbol}${Number(n).toFixed(2)}`;
    return (
      <Box sx={{ maxWidth: 540, mx: 'auto', mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Payment Successful
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your slot is booked. A receipt with the tax invoice has been emailed to you.
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 3, textAlign: 'left' }}>
              <Row label="Amount paid" value={fmt(success.total)} bold />
              <Row label="Payment ID" value={success.payment_id} mono />
              {success.invoice_no && <Row label="Invoice" value={success.invoice_no} mono />}
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ mt: 4, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={() => navigate('/')}>Home</Button>
              <Button variant="contained" onClick={() => navigate('/profile')}>My Profile</Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const fmt = (n: number) => `${breakup.currency}${n.toFixed(2)}`;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await doCheckout({
        variables: {
          input: {
            pod_id: state.pod_id || null,
            amount,
            description: state.description || (state.pod_title ? `Pod booking · ${state.pod_title}` : 'Booking'),
            contact_phone: phone || null,
            simulate_failure: simulateFailure,
          },
        },
      });
      const p = res.data?.dummyCheckout;
      if (p?.status === 'SUCCESS') {
        setSuccess(p);
      } else {
        setError('Payment failed. Please try again.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>Checkout</Typography>
        {fs?.dummy_mode && <Chip color="warning" size="small" label="Dummy Mode" />}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Order Summary
            </Typography>
            {state.pod_title && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {state.pod_title}
              </Typography>
            )}
            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.75}>
              <Row label="Ticket price" value={fmt(breakup.total)} />
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Inclusive of:
              </Typography>
              <Row label={`Platform Fee (${breakup.feePct}%)`} value={fmt(breakup.fee)} />
              <Row label={`GST (${breakup.gstPct}%)`} value={fmt(breakup.gst)} />
              <Divider sx={{ my: 1 }} />
              <Row label="Total payable" value={fmt(breakup.total)} bold />
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Payment Details
            </Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Email"
                value={meData?.me?.email || ''}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <TextField
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Payment Method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                fullWidth
              >
                {PAYMENT_METHODS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Simulate"
                value={simulateFailure ? 'fail' : 'success'}
                onChange={(e) => setSimulateFailure(e.target.value === 'fail')}
                fullWidth
                helperText="Dummy gateway only"
              >
                <MenuItem value="success">Successful Payment</MenuItem>
                <MenuItem value="fail">Failed Payment</MenuItem>
              </TextField>

              {error && <Alert severity="error">{error}</Alert>}

              <Button
                variant="contained"
                size="large"
                startIcon={<LockIcon />}
                onClick={submit}
                disabled={submitting || amount <= 0}
              >
                {submitting ? 'Processing…' : `Pay ${fmt(breakup.total)}`}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                You will receive an email with the tax invoice on success.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

function Row({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500}>
        {label}
      </Typography>
      <Typography
        variant={bold ? 'subtitle1' : 'body2'}
        fontWeight={bold ? 700 : 500}
        sx={mono ? { fontFamily: 'monospace' } : undefined}
      >
        {value}
      </Typography>
    </Stack>
  );
}
