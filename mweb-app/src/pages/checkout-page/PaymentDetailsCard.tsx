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
  const fieldSx = {
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.66)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#ff8b5f' },
    '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 3 },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.16)' },
    '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.58)' },
  };

  return (
    <Card sx={{ flex: 1, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.08)', color: '#fff', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.12)' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={900} gutterBottom>Payment details</Typography>
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
            sx={fieldSx}
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
            sx={fieldSx}
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
            sx={fieldSx}
          />
          <TextField select label="Payment Method" name="method" value={values.method} onChange={(e) => setField('method', e.target.value)} onBlur={handleBlur} fullWidth sx={fieldSx}>
            {CHECKOUT_PAYMENT_METHODS.map((method) => <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>)}
          </TextField>
          <TextField
            select
            label="Simulate"
            value={values.simulate_failure ? 'fail' : 'success'}
            onChange={(e) => setField('simulate_failure', e.target.value === 'fail')}
            fullWidth
            helperText="Dummy gateway only"
            sx={fieldSx}
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
            sx={{ minHeight: 48, borderRadius: 3, fontWeight: 900, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}
          >
            {submitting ? 'Processing...' : `Pay ${formatMoney(currency, total)}`}
          </Button>
          <Typography variant="caption" sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.62)' }}>
            Receipt and invoice will be sent after successful payment.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
