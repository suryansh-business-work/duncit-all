import { Divider, Stack, Typography } from '@mui/material';
import { formatFoodMoney } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  subtotal: number;
  discount: number;
  discountPct: number;
  /** The venue's coupon and what it took off — after the discount above it. */
  coupon?: { code: string; pct: number; amount: number } | null;
  total: number;
  currency: string;
  testId: string;
}

function Row({ label, value, strong, testId }: Readonly<{ label: string; value: string; strong?: boolean; testId: string }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ color: strong ? 'text.primary' : 'text.secondary', fontWeight: strong ? 700 : 400 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 700 : 600, textAlign: 'right' }} data-testid={testId}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Subtotal, the QR-order discount and the coupon when there is one, and the
 * total — the same lines on the cart (where they follow the steppers, so the block is a
 * live region) and on the placed order.
 */
export default function FoodTotals({ subtotal, discount, discountPct, coupon, total, currency, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (amount: number) => formatFoodMoney(amount, currency);
  return (
    <Stack spacing={0.75} aria-live="polite" data-testid={testId}>
      <Row label={t('mweb.venueFood.cart.subtotal')} value={money(subtotal)} testId={`${testId}-subtotal`} />
      {discount > 0 && (
        <Row
          label={t('mweb.venueFood.cart.discount', { vars: { pct: String(discountPct) } })}
          value={`− ${money(discount)}`}
          testId={`${testId}-discount`}
        />
      )}
      {coupon && (
        <Row
          label={t('mweb.venueFood.cart.couponLine', { vars: { code: coupon.code, pct: String(coupon.pct) } })}
          value={`− ${money(coupon.amount)}`}
          testId={`${testId}-coupon`}
        />
      )}
      <Divider />
      <Row label={t('mweb.venueFood.cart.total')} value={money(total)} strong testId={`${testId}-total`} />
    </Stack>
  );
}
