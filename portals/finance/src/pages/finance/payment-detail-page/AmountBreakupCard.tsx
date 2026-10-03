import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { exclusiveOfGstBill } from '@duncit/utils';
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
 * `original_total` is the cart before EVERY discount (ticket gross + products).
 * The multi-ticket tier comes off the tickets first; the coupon is then
 * evaluated on that discounted payable and coins re-quote what the coupon left
 * (payment.service `applyCoupon`/`applyCoins`), and `computeQuote` extracts GST
 * inclusive from what is left. So every deduction cuts the value BEFORE tax —
 * the way GST law reads an invoice discount (CGST Act s.15(3)(a)) — and the
 * card prints it in that order: original → subtotal (excl. GST) → each
 * deduction (excl. GST) → taxable value → GST. The shared `exclusiveOfGstBill`
 * reconciles it to the paisa, and the mWeb and native checkout read the same
 * way. The GST row is the tax actually charged. The platform fee is NOT in this
 * list: it is carved out of the subtotal, not added on top — see the memo block below.
 *
 * Each deduction is skipped when zero rather than shown as a "− ₹0.00" no-op.
 * The ticket discount reads the payment's frozen snapshot, never the pod's
 * current tiers.
 */
function buildLines(detail: PaymentDetail, t: Translator['t']): BreakupLine[] {
  const p = detail.payment;
  const sym = p.currency_symbol;
  // Named when the code survived on the payment, bare when it did not — the
  // two are separate keys so a translator is never handed a dangling "()".
  const couponLabel = p.coupon_code
    ? t('finance.payment.couponDiscountWith', { vars: { code: p.coupon_code } })
    : t('finance.payment.couponDiscount');
  const bill = exclusiveOfGstBill(
    detail.original_total,
    [
      {
        key: 'ticket-discount',
        label: t('finance.payment.ticketDiscountLine', { vars: { pct: p.ticket_discount_pct } }),
        amount: p.ticket_discount_amount,
      },
      { key: 'coupon', label: couponLabel, amount: p.coupon_discount },
      {
        key: 'coins',
        label: t('finance.payment.coinsRedeemedLine', { vars: { n: detail.coins_redeemed } }),
        amount: detail.coins_redeemed,
      },
    ],
    p.subtotal,
    p.gst_pct,
  );
  const lines: BreakupLine[] = [
    { key: 'original', label: t('finance.payment.originalTotal'), value: money(sym, detail.original_total) },
    { key: 'subtotal', label: t('finance.payment.subtotalExclGst'), value: money(sym, bill.subtotal) },
    ...bill.discounts.map((line) => ({ key: line.key, label: line.label, value: `− ${money(sym, line.amount)}` })),
  ];
  // With nothing deducted the subtotal IS the taxable value — printing it twice says nothing.
  if (bill.discounts.length > 0) {
    lines.push({ key: 'taxable', label: t('finance.payment.taxableValue'), value: money(sym, p.subtotal) });
  }
  lines.push({
    key: 'gst',
    label: t('finance.payment.gstPct', { vars: { pct: p.gst_pct.toFixed(2) } }),
    value: money(sym, p.gst_amount),
  });
  return lines;
}

/** Every line of the bill, labelled — the first thing Finance reconciles. */
export default function AmountBreakupCard({ detail }: Readonly<{ detail: PaymentDetail }>) {
  const { t } = useTranslation();
  const p = detail.payment;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 300, width: '100%' }}>
      <CardContent>
        <Typography component="h2"
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
