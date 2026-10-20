import { Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { ruleValueLabel, rupees } from '../format';
import type { PriceBreakdown, Translate } from '../types';

interface Line {
  id: string;
  label: string;
  amount: string;
  strong?: boolean;
  tone?: 'success.main' | 'text.secondary';
}

/** "20 guests × ₹300 = ₹6,000" — how the base was built, by model. */
function baseLine(t: Translate, b: PriceBreakdown): string {
  const vars = { pax: b.pax, hours: b.hours, rate: rupees(b.rate), base: rupees(b.base) };
  if (b.model === 'PER_PAX') return t('venuePricing.breakdown.basePerPax', { vars });
  if (b.model === 'PER_HOUR') return t('venuePricing.breakdown.basePerHour', { vars });
  if (b.model === 'PER_SLOT') return t('venuePricing.breakdown.baseSlot', { vars });
  return t('venuePricing.breakdown.baseFlat', { vars });
}

/** Every line of a quote, in the order the server built it. Amounts are the server's, never recomputed. */
function linesOf(t: Translate, b: PriceBreakdown): Line[] {
  const lines: Line[] = [{ id: 'base', label: baseLine(t, b), amount: rupees(b.base) }];
  b.rules.forEach((rule, i) => {
    lines.push({
      id: `rule-${i}`,
      label: `${rule.label} ${ruleValueLabel(rule.mode, rule.value)}`,
      amount: `${rule.amount < 0 ? '-' : '+'}${rupees(Math.abs(rule.amount))}`,
    });
  });
  if (b.rules.length > 0) {
    // The server floors an adjusted price at zero; the subtotal line says the same.
    const adjusted = Math.max(0, b.base + b.rules_total);
    lines.push({ id: 'adjusted', label: t('venuePricing.breakdown.afterRules'), amount: rupees(adjusted) });
  }
  const optional: [string, string, number][] = [
    ['min-spend', t('venuePricing.breakdown.minSpendTopUp'), b.min_spend_top_up],
    ['cleaning', t('venuePricing.breakdown.cleaningFee'), b.cleaning_fee],
    ['pet', t('venuePricing.breakdown.petFee'), b.pet_fee],
  ];
  for (const [id, label, amount] of optional) {
    if (amount > 0) lines.push({ id, label, amount: `+${rupees(amount)}` });
  }
  lines.push({ id: 'venue-price', label: t('venuePricing.breakdown.venuePrice'), amount: rupees(b.venue_price), strong: true });
  if (b.taxes > 0) {
    lines.push({ id: 'gst', label: t('venuePricing.breakdown.gst', { vars: { pct: b.gst_pct } }), amount: `+${rupees(b.taxes)}` });
  }
  lines.push({
    id: 'payout',
    label: t('venuePricing.breakdown.youReceive'),
    amount: rupees(b.venue_payout),
    strong: true,
    tone: 'success.main',
  });
  lines.push({
    id: 'fee',
    label: t('venuePricing.breakdown.duncitFee', { vars: { pct: b.platform_fee_pct } }),
    amount: rupees(b.platform_fee),
    tone: 'text.secondary',
  });
  lines.push({ id: 'total', label: t('venuePricing.breakdown.total'), amount: rupees(b.total), strong: true });
  if (b.deposit > 0) {
    lines.push({ id: 'deposit', label: t('venuePricing.breakdown.deposit'), amount: rupees(b.deposit), tone: 'text.secondary' });
  }
  return lines;
}

/** A quote, line by line — the live preview, the day drawer and an event-request offer all draw it. */
export default function PriceBreakdownView({ breakdown }: Readonly<{ breakdown: PriceBreakdown }>) {
  const { t } = useTranslation();
  const lines = linesOf(t, breakdown);
  return (
    <Stack spacing={0.75} data-testid="price-breakdown" aria-live="polite">
      {lines.map((line) => (
        <Stack key={line.id}>
          {line.id === 'venue-price' || line.id === 'total' ? <Divider sx={{ mb: 0.75 }} /> : null}
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }} data-testid={`price-line-${line.id}`}>
            <Typography variant="body2" sx={{ color: line.tone ?? 'text.primary', fontWeight: line.strong ? 800 : 400 }}>
              {line.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: line.tone ?? 'text.primary', fontWeight: line.strong ? 800 : 600, whiteSpace: 'nowrap' }}
            >
              {line.amount}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
