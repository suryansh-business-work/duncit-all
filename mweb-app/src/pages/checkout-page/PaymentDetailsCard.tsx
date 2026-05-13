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
import type { FormikProps } from 'formik';
import type { CheckoutForm } from './queries';
import { CHECKOUT_PAYMENT_METHODS } from './checkout.form';
import { formatMoney } from './checkoutMath';

interface Props {
  formik: FormikProps<CheckoutForm>;
  error: string | null;
  submitting: boolean;
  total: number;
  currency: string;
}

export default function PaymentDetailsCard({
  formik,
  error,
  submitting,
  total,
  currency,
}: Props) {
  const { values, errors, touched, handleBlur, handleChange, setFieldValue, submitForm } = formik;
  const setField = <Key extends keyof CheckoutForm>(key: Key, value: CheckoutForm[Key]) => {
    setFieldValue(key, value);
  };
  const fieldError = (key: keyof CheckoutForm) => {
    const value = values[key];
    const hasValue = typeof value === 'boolean' ? true : String(value ?? '').length > 0;
    return Boolean(errors[key] && (touched[key] || hasValue));
  };
  const helperText = (key: keyof CheckoutForm, fallback = ' ') =>
    fieldError(key) ? String(errors[key]) : fallback;

  return (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Payment Details</Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Email"
            name="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={fieldError('email')}
            helperText={helperText('email')}
            fullWidth
            required
          />
          <TextField
            label="Phone"
            name="phone"
            value={values.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            error={fieldError('phone')}
            helperText={helperText('phone')}
            fullWidth
            required
          />
          <TextField
            label="Billing address"
            name="billing_address"
            value={values.billing_address}
            onChange={handleChange}
            onBlur={handleBlur}
            error={fieldError('billing_address')}
            helperText={helperText('billing_address')}
            multiline
            minRows={3}
            fullWidth
            required
          />
          <TextField select label="Payment Method" name="method" value={values.method} onChange={(e) => setField('method', e.target.value)} onBlur={handleBlur} fullWidth>
            {CHECKOUT_PAYMENT_METHODS.map((method) => <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>)}
          </TextField>
          <TextField
            select
            label="Simulate"
            value={values.simulate_failure ? 'fail' : 'success'}
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
            onClick={submitForm}
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
