import { Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import { money, type PodFinanceBreakdown } from './queries';

function Line({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>{label}</Typography>
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>{value}</Typography>
    </Stack>
  );
}

/** Side card summarizing what the host earns from this pod. */
export default function HostEarningsCard({ breakdown }: Readonly<{ breakdown: PodFinanceBreakdown }>) {
  const w = breakdown.waterfall;
  const sym = breakdown.currency_symbol;
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Host Earnings Summary
        </Typography>
        <Stack spacing={1}>
          <Line label="Host Amount" value={money(sym, w.host_amount)} />
          <Line
            label={`− Host Commission (${w.host_commission_pct.toFixed(2)}%)`}
            value={`− ${money(sym, w.host_commission_amount)}`}
          />
          <Divider />
          <Line label="Host Receives" value={money(sym, w.host_receives)} bold />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          The host earns {w.host_earn_pct.toFixed(2)}% of the customer payment.
        </Typography>
      </CardContent>
    </Card>
  );
}
