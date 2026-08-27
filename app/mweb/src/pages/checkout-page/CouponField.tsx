import { useState } from 'react';
import { Alert, Chip, Link, Stack, TextField, Typography } from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { DuncitButton } from '@duncit/buttons';
import type { AvailableCoupon, CouponPreview } from './queries';
import { useTranslation } from '../../i18n/useTranslation';
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
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const couponCodeLabel = t('mweb.checkout.couponCode');
  const availableLabel =
    available.length === 1
      ? t('mweb.checkout.couponsAvailableOne')
      : t('mweb.checkout.couponsAvailableMany', { count: available.length });

  if (applied?.ok) {
    return (
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.25,
          borderRadius: '16px',
          bgcolor: 'success.light',
          color: 'success.contrastText'
        }}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <LocalOfferIcon fontSize="small" />
          <Typography variant="body2" sx={{
            fontWeight: 600
          }}>
            {t('mweb.checkout.couponApplied', { vars: { code: applied.code ?? '' } })}
          </Typography>
          <Chip
            size="small"
            label={`− ${formatMoney(currency, applied.discount_amount)}`}
            color="success"
          />
        </Stack>
        <DuncitButton size="small" color="inherit" onClick={onRemove}>
          {t('mweb.checkout.couponRemove')}
        </DuncitButton>
      </Stack>
    );
  }
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          label={couponCodeLabel}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          slotProps={{
            htmlInput: { style: { textTransform: 'uppercase' }, 'aria-label': couponCodeLabel }
          }}
        />
        <DuncitButton variant="outlined" onClick={() => onApply()} disabled={applying || !code.trim()}>
          {applying ? t('mweb.checkout.couponApplying') : t('mweb.checkout.couponApply')}
        </DuncitButton>
      </Stack>
      {available.length > 0 && (
        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={() => setPickerOpen(true)}
          sx={{ alignSelf: 'flex-start', fontWeight: 600, fontSize: 13 }}
        >
          {availableLabel}
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
