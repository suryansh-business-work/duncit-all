import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
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
function buildLines(detail: PaymentDetail): BreakupLine[] {
  const p = detail.payment;
  const sym = p.currency_symbol;
  const lines: BreakupLine[] = [
    { key: 'original', label: 'Original total', value: money(sym, detail.original_total) },
  ];
  if (p.coupon_discount > 0) {
    const label = p.coupon_code ? `Coupon discount (${p.coupon_code})` : 'Coupon discount';
    lines.push({ key: 'coupon', label, value: `− ${money(sym, p.coupon_discount)}` });
  }
  if (detail.coins_redeemed > 0) {
    lines.push({
      key: 'coins',
      label: `Coins redeemed (${detail.coins_redeemed})`,
      value: `− ${money(sym, detail.coins_redeemed)}`,
    });
  }
  lines.push(
    { key: 'subtotal', label: 'Subtotal (net of GST)', value: money(sym, p.subtotal) },
    { key: 'gst', label: `GST (${p.gst_pct.toFixed(2)}%)`, value: money(sym, p.gst_amount) },
  );
  return lines;
}

/** Every line of the bill, labelled — the first thing Finance reconciles. */
export default function AmountBreakupCard({ detail }: Readonly<{ detail: PaymentDetail }>) {
  const p = detail.payment;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 300, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
          Amount Breakup
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          {p.description}
        </Typography>
        <Stack spacing={1}>
          {buildLines(detail).map((line) => (
            <InfoRow key={line.key} variant="split" label={line.label} value={line.value} />
          ))}
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <InfoRow
          variant="split"
          bold
          label="Total charged"
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
        <Typography variant="overline" color="text.secondary" display="block">
          Of which Duncit&apos;s share
        </Typography>
        <InfoRow
          variant="split"
          label={`Platform fee (${p.platform_fee_pct.toFixed(2)}% of subtotal)`}
          value={money(p.currency_symbol, p.platform_fee_amount)}
        />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Already included in the total charged above — Duncit&apos;s revenue is carved out of the
          subtotal, not added to it.
        </Typography>
      </CardContent>
    </Card>
  );
}
