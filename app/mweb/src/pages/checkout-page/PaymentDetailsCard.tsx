import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { alpha, useTheme } from '@mui/material/styles';
import type { Control } from 'react-hook-form';
import type { AvailableCoupon, CheckoutForm, CouponPreview } from './queries';
import { CheckoutFields } from './checkout';
import CouponField from './CouponField';
import { formatMoney } from './checkoutMath';

interface Props {
  control: Control<CheckoutForm>;
  onSubmit: () => void;
  error: string | null;
  submitting: boolean;
  total: number;
  currency: string;
  dummyMode: boolean;
  effectiveTotal: number;
  coupon: CouponPreview | null;
  couponCode: string;
  setCouponCode: (value: string) => void;
  couponError: string | null;
  applyingCoupon: boolean;
  availableCoupons: AvailableCoupon[];
  onApplyCoupon: (code?: string) => void;
  onRemoveCoupon: () => void;
}

export default function PaymentDetailsCard({
  control,
  onSubmit,
  error,
  submitting,
  total,
  currency,
  dummyMode,
  effectiveTotal,
  coupon,
  couponCode,
  setCouponCode,
  couponError,
  applyingCoupon,
  availableCoupons,
  onApplyCoupon,
  onRemoveCoupon,
}: Readonly<Props>) {
  const discounted = effectiveTotal < total;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
          <CheckoutFields
            control={control}
            fieldSx={fieldSx}
            dummyMode={dummyMode}
            selectMenuProps={selectMenuProps}
          />
          <CouponField
            code={couponCode}
            setCode={setCouponCode}
            applied={coupon}
            error={couponError}
            applying={applyingCoupon}
            currency={currency}
            available={availableCoupons}
            onApply={onApplyCoupon}
            onRemove={onRemoveCoupon}
          />
          {error && <Alert severity="error">{error}</Alert>}
          {discounted && (
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              <s>{formatMoney(currency, total)}</s> &nbsp;you save{' '}
              {formatMoney(currency, total - effectiveTotal)}
            </Typography>
          )}
          <Button
            variant="contained"
            size="large"
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
            onClick={onSubmit}
            disabled={submitting || total <= 0}
            sx={{ minHeight: 48, borderRadius: 3, fontWeight: 900, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}
          >
            {submitting ? 'Processing...' : `Pay ${formatMoney(currency, effectiveTotal)}`}
          </Button>
          <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            Receipt and invoice will be sent after successful payment.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
