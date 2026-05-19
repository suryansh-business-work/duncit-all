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
import { alpha, useTheme } from '@mui/material/styles';
import type { FormikProps } from 'formik';
import type { CheckoutForm } from './queries';
import { CHECKOUT_PAYMENT_METHODS } from './checkout.form';
import CheckoutContactFields from './CheckoutContactFields';
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
  const { values, handleBlur, setFieldValue, submitForm } = formik;
  const setField = <Key extends keyof CheckoutForm>(key: Key, value: CheckoutForm[Key]) => {
    setFieldValue(key, value);
  };
  const fieldSx = {
    '& .MuiInputLabel-root': { color: 'text.secondary' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#ff8b5f' },
    '& .MuiOutlinedInput-root': { minHeight: 56, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.background.paper, 0.84), color: 'text.primary', borderRadius: 3 },
    '& .MuiInputBase-input, & .MuiSelect-select': { color: 'text.primary', py: 1.45 },
    '& .MuiSelect-select': { display: 'flex', alignItems: 'center' },
    '& .MuiSelect-icon': { color: 'text.secondary' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(255,255,255,0.16)' : alpha(theme.palette.text.primary, 0.16) },
    '& .MuiFormHelperText-root': { color: 'text.secondary' },
  };
  const selectMenuProps = {
    PaperProps: {
      sx: {
        mt: 1,
        borderRadius: 3,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider',
        bgcolor: isDark ? '#171821' : theme.palette.background.paper,
        boxShadow: '0 18px 44px rgba(15,23,42,0.2)',
        '& .MuiMenuItem-root': { minHeight: 42, fontWeight: 700, borderRadius: 2, mx: 0.75, my: 0.25 },
      },
    },
  };

  return (
    <Card sx={{ flex: 1, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : alpha(theme.palette.background.paper, 0.82), color: 'text.primary', boxShadow: 'none', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={900} gutterBottom>Payment details</Typography>
        <Stack spacing={2} sx={{ mt: 3 }}>
          <CheckoutContactFields formik={formik} fieldSx={fieldSx} />
          <TextField select label="Payment Method" name="method" value={values.method} onChange={(e) => setField('method', e.target.value)} onBlur={handleBlur} fullWidth sx={fieldSx} SelectProps={{ MenuProps: selectMenuProps }}>
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
            SelectProps={{ MenuProps: selectMenuProps }}
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
