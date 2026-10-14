import { Divider, Stack, Typography } from '@mui/material';
import { formatFoodMoney, type FoodTaxLine } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  subtotal: number;
  discount: number;
  discountPct: number;
  /** The venue's coupon and what it took off — after the discount above it. */
  coupon?: { code: string; pct: number; amount: number } | null;
  /** The GST (`foodTaxLine`): a line added before the total, or a note under it when it is inside the prices. */
  tax?: FoodTaxLine | null;
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
 * Subtotal, the QR-order discount and the coupon when there is one, GST added
 * on top (or a note that the prices include it), and the total — the same lines on the cart (where they follow the steppers, so the block is a
 * live region) and on the placed order.
 */
export default function FoodTotals({ subtotal, discount, discountPct, coupon, tax, total, currency, testId }: Readonly<Props>) {
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
      {tax?.mode === 'EXCLUSIVE' && (
        <Row
          label={t('mweb.venueFood.cart.gstAdded', { vars: { pct: String(tax.pct) } })}
          value={`+ ${money(tax.amount)}`}
          testId={`${testId}-gst`}
        />
      )}
      <Divider />
      <Row label={t('mweb.venueFood.cart.total')} value={money(total)} strong testId={`${testId}-total`} />
      {tax?.mode === 'INCLUSIVE' && (
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'right' }} data-testid={`${testId}-gst-included`}>
          {t('mweb.venueFood.cart.gstIncluded', { vars: { amount: money(tax.amount), pct: String(tax.pct) } })}
        </Typography>
      )}
    </Stack>
  );
}
