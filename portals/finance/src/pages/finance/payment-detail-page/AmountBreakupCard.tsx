import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { money, type PaymentDetail } from './queries';

interface BreakupLine {
  key: string;
  label: string;
  value: string;
  bold?: boolean;
}

/**
 * The waterfall from what the cart was worth to what the card was charged —
 * and ONLY the lines that actually reconcile to the total.
 *
 * Coupon and coins each re-quote the reduced gross (payment.service
 * `applyCoupon`/`applyCoins`), so original − coupon − coins is the gross that
 * was priced; `computeQuote` then extracts GST inclusive from that gross
 * (gst = value × g/(100+g), subtotal = value − gst, total = value), which makes
 * subtotal + gst = total exactly. The platform fee is NOT in this list: it is
 * carved out of the subtotal, not added on top — see the memo block below.
 *
 * Coupon and coins render as negatives so the arithmetic reads top to bottom;
 * both are skipped when zero rather than shown as a "− ₹0.00" no-op.
 */
function buildLines(detail: PaymentDetail, t: Translator['t']): BreakupLine[] {
  const p = detail.payment;
  const sym = p.currency_symbol;
  const lines: BreakupLine[] = [
    { key: 'original', label: t('finance.payment.originalTotal'), value: money(sym, detail.original_total) },
  ];
  if (p.coupon_discount > 0) {
    // Named when the code survived on the payment, bare when it did not — the
    // two are separate keys so a translator is never handed a dangling "()".
    const label = p.coupon_code
      ? t('finance.payment.couponDiscountWith', { vars: { code: p.coupon_code } })
      : t('finance.payment.couponDiscount');
    lines.push({ key: 'coupon', label, value: `− ${money(sym, p.coupon_discount)}` });
  }
  if (detail.coins_redeemed > 0) {
    lines.push({
      key: 'coins',
      label: t('finance.payment.coinsRedeemedLine', { vars: { n: detail.coins_redeemed } }),
      value: `− ${money(sym, detail.coins_redeemed)}`,
    });
  }
  lines.push(
    { key: 'subtotal', label: t('finance.payment.subtotalNetGst'), value: money(sym, p.subtotal) },
    {
      key: 'gst',
      label: t('finance.payment.gstPct', { vars: { pct: p.gst_pct.toFixed(2) } }),
      value: money(sym, p.gst_amount),
    },
  );
  return lines;
}

/** Every line of the bill, labelled — the first thing Finance reconciles. */
export default function AmountBreakupCard({ detail }: Readonly<{ detail: PaymentDetail }>) {
  const { t } = useTranslation();
  const p = detail.payment;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 300, width: '100%' }}>
      <CardContent>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 0.5
          }}>
          {t('finance.payment.amountBreakup')}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            mb: 1.5
          }}>
          {p.description}
        </Typography>
        <Stack spacing={1}>
          {buildLines(detail, t).map((line) => (
            <InfoRow key={line.key} variant="split" label={line.label} value={line.value} />
          ))}
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <InfoRow
          variant="split"
          bold
          label={t('finance.payment.totalCharged')}
          value={money(p.currency_symbol, p.total)}
        />

        {/*
          A memo, never an addend. `computeQuote` takes the platform fee FROM the
          net (fee = subtotal × f), so this money is already inside the subtotal
          above. Listed in the waterfall it would read as subtotal + fee + gst =
          total and overstate the charge by the entire fee — the exact number a
          reconciliation screen must not invite anyone to act on. Rendered even
          at zero: Finance needs to see the absence, not an absent line.
        */}
        <Divider sx={{ my: 1.5 }} />
        <Typography
          variant="overline"
          sx={{
            color: "text.secondary",
            display: "block"
          }}>
          {t('finance.payment.duncitShare')}
        </Typography>
        <InfoRow
          variant="split"
          label={t('finance.payment.platformFeeOfSubtotal', { vars: { pct: p.platform_fee_pct.toFixed(2) } })}
          value={money(p.currency_symbol, p.platform_fee_amount)}
        />
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            mt: 0.5
          }}>
          {t('finance.payment.platformFeeNote')}
        </Typography>
      </CardContent>
    </Card>
  );
}
