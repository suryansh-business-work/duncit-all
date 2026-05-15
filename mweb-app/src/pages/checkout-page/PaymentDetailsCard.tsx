import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import { alpha, useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { values, errors, touched, handleBlur, handleChange, setFieldValue, submitForm } = formik;
  const setField = <Key extends keyof CheckoutForm>(key: Key, value: CheckoutForm[Key]) => {
    setFieldValue(key, value);
  };
  const payWith = async (method: CheckoutForm['method']) => {
    await setFieldValue('method', method);
    submitForm();
  };
  const fieldError = (key: keyof CheckoutForm) => {
    const value = values[key];
    const hasValue = typeof value === 'boolean' ? true : String(value ?? '').length > 0;
    return Boolean(errors[key] && (touched[key] || hasValue));
  };
  const helperText = (key: keyof CheckoutForm, fallback = ' ') =>
    fieldError(key) ? String(errors[key]) : fallback;
  const fieldSx = {
    '& .MuiInputLabel-root': { color: 'text.secondary' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#ff8b5f' },
    '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.background.paper, 0.84), color: 'text.primary', borderRadius: 3 },
    '& .MuiInputBase-input, & .MuiSelect-select': { color: 'text.primary' },
    '& .MuiSelect-icon': { color: 'text.secondary' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(255,255,255,0.16)' : alpha(theme.palette.text.primary, 0.16) },
    '& .MuiFormHelperText-root': { color: 'text.secondary' },
  };

  return (
    <Card sx={{ flex: 1, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.background.paper, 0.82), color: 'text.primary', boxShadow: 'none', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={900} gutterBottom>Payment details</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 0.5, mb: 1.5 }}>
          <Button
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => void payWith('GOOGLE_PAY')}
            disabled={submitting || total <= 0}
            sx={{
              minHeight: 46,
              borderRadius: 3,
              fontWeight: 800,
              bgcolor: '#fff',
              color: '#1f1f1f',
              border: '1px solid rgba(255,255,255,0.32)',
              '&:hover': { bgcolor: '#f5f5f5' },
            }}
          >
            Pay with Google Pay
          </Button>
          <Button
            fullWidth
            startIcon={<AppleIcon />}
            onClick={() => void payWith('APPLE_PAY')}
            disabled={submitting || total <= 0}
            sx={{
              minHeight: 46,
              borderRadius: 3,
              fontWeight: 800,
              bgcolor: '#000',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.32)',
              '&:hover': { bgcolor: '#1a1a1a' },
            }}
          >
            Pay with Apple Pay
          </Button>
        </Stack>
        <Box sx={{ position: 'relative', my: 1 }}>
          <Divider />
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              top: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              px: 1,
              bgcolor: isDark ? 'rgba(15,15,25,0.95)' : alpha(theme.palette.background.paper, 0.96),
              color: 'text.secondary',
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            OR PAY ANOTHER WAY
          </Typography>
        </Box>
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
          <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            Receipt and invoice will be sent after successful payment.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
