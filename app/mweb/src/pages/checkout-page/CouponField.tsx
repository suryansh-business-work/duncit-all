import { useState } from 'react';
import { Alert, Button, Chip, Link, Stack, TextField, Typography } from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import type { AvailableCoupon, CouponPreview } from './queries';
import { formatMoney } from './checkoutMath';
import CouponsDialog from './CouponsDialog';

interface Props {
  code: string;
  setCode: (value: string) => void;
  applied: CouponPreview | null;
  error: string | null;
  applying: boolean;
  currency: string;
  available: AvailableCoupon[];
  onApply: (code?: string) => void;
  onRemove: () => void;
}

/** Coupon entry for the payment step. Shows the applied discount once a valid
 * code is entered; the strikethrough total lives on the pay button. */
export default function CouponField({
  code,
  setCode,
  applied,
  error,
  applying,
  currency,
  available,
  onApply,
  onRemove,
}: Readonly<Props>) {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (applied?.ok) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 1.25, borderRadius: 2, bgcolor: 'success.light', color: 'success.contrastText' }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <LocalOfferIcon fontSize="small" />
          <Typography variant="body2" fontWeight={800}>
            {applied.code} applied
          </Typography>
          <Chip
            size="small"
            label={`− ${formatMoney(currency, applied.discount_amount)}`}
            color="success"
          />
        </Stack>
        <Button size="small" color="inherit" onClick={onRemove}>
          Remove
        </Button>
      </Stack>
    );
  }
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          label="Coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          inputProps={{ style: { textTransform: 'uppercase' }, 'aria-label': 'Coupon code' }}
        />
        <Button variant="outlined" onClick={() => onApply()} disabled={applying || !code.trim()}>
          {applying ? 'Applying…' : 'Apply'}
        </Button>
      </Stack>
      {available.length > 0 && (
        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={() => setPickerOpen(true)}
          sx={{ alignSelf: 'flex-start', fontWeight: 800, fontSize: 13 }}
        >
          View {available.length} available coupon{available.length === 1 ? '' : 's'}
        </Link>
      )}
      {error && <Alert severity="warning">{error}</Alert>}
      <CouponsDialog
        open={pickerOpen}
        coupons={available}
        currency={currency}
        onClose={() => setPickerOpen(false)}
        onPick={(picked) => {
          setPickerOpen(false);
          setCode(picked);
          onApply(picked);
        }}
      />
    </Stack>
  );
}
