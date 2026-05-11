import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import type { CheckoutForm } from './queries';
import { formatMoney } from './checkoutMath';

interface Props {
  form: CheckoutForm;
  error: string | null;
  submitting: boolean;
  total: number;
  currency: string;
  onChange: (form: CheckoutForm) => void;
  onSubmit: () => void;
}

const paymentMethods = [
  { value: 'DUMMY_UPI', label: 'UPI (Dummy)' },
  { value: 'DUMMY_CARD', label: 'Credit / Debit Card (Dummy)' },
  { value: 'DUMMY_NETBANKING', label: 'Net Banking (Dummy)' },
];

export default function PaymentDetailsCard({
  form,
  error,
  submitting,
  total,
  currency,
  onChange,
  onSubmit,
}: Props) {
  const setField = <Key extends keyof CheckoutForm>(key: Key, value: CheckoutForm[Key]) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Payment Details</Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Email" value={form.email} onChange={(e) => setField('email', e.target.value)} fullWidth required />
          <TextField label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} fullWidth required />
          <TextField
            label="Billing address"
            value={form.billing_address}
            onChange={(e) => setField('billing_address', e.target.value)}
            multiline
            minRows={3}
            fullWidth
            required
          />
          <TextField select label="Payment Method" value={form.method} onChange={(e) => setField('method', e.target.value)} fullWidth>
            {paymentMethods.map((method) => <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>)}
          </TextField>
          <TextField
            select
            label="Simulate"
            value={form.simulate_failure ? 'fail' : 'success'}
            onChange={(e) => setField('simulate_failure', e.target.value === 'fail')}
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
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
            onClick={onSubmit}
            disabled={submitting || total <= 0}
            sx={{ minHeight: 48 }}
          >
            {submitting ? 'Processing...' : `Pay ${formatMoney(currency, total)}`}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            Receipt and invoice will be sent after successful payment.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
