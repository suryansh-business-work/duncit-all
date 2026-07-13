import { useQuery } from '@apollo/client';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { PUBLIC_FINANCE_SETTINGS } from '../queries';

interface BreakdownLine {
  key: string;
  label: string;
  value: string;
  bold?: boolean;
}

const buildV2Lines = (b: any, kind: string, sym: string): BreakdownLine[] => {
  const money = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;
  const isHost = kind === 'HOST_PAYMENT';
  const partyLabel = isHost ? 'Host amount (pool remainder)' : 'Venue amount (booked slot price)';
  return [
    { key: 'collected', label: 'Customer collected', value: money(b.collected_total) },
    { key: 'gst', label: `− GST (${Number(b.gst_pct || 0).toFixed(2)}%)`, value: `− ${money(b.gst_amount)}` },
    { key: 'fee', label: `− Platform fee (${Number(b.platform_fee_pct || 0).toFixed(2)}%)`, value: `− ${money(b.platform_fee_amount)}` },
    { key: 'pool', label: 'Remaining pool', value: money(b.pool_amount) },
    { key: 'party', label: partyLabel, value: money(b.share_amount) },
    { key: 'commission', label: `− Commission (${Number(b.commission_pct || 0).toFixed(2)}%)`, value: `− ${money(b.commission_amount)}` },
    { key: 'payout', label: 'Payout', value: money(b.payout_amount), bold: true },
    { key: 'duncit', label: 'Duncit revenue (pod total)', value: money(b.duncit_revenue) },
  ];
};

const buildV1Lines = (b: any, sym: string): BreakdownLine[] => {
  const money = (n: number) => `${sym}${Number(n || 0).toFixed(2)}`;
  return [
    { key: 'collected', label: 'Customer collected', value: money(b.collected_total) },
    { key: 'venue-bill', label: 'Venue bill', value: money(b.venue_bill) },
    { key: 'gst', label: `− GST (${Number(b.gst_pct || 0).toFixed(2)}%)`, value: `− ${money(b.gst_amount)}` },
    { key: 'duncit', label: `− Duncit cut (${Number(b.duncit_pct || 0).toFixed(2)}%)`, value: `− ${money(b.duncit_amount)}` },
    { key: 'payout', label: `Payout (${Number(b.payout_pct || 0).toFixed(2)}%)`, value: money(b.payout_amount), bold: true },
  ];
};

/** Read-only settlement lines shown in the review dialog. v2 = the pool
 * waterfall; v1 = the legacy venue-bill snapshot. */
export default function ReleaseBreakdownLines({ request }: Readonly<{ request: any }>) {
  const settings = useQuery<{ publicFinanceSettings: { currency_symbol: string } }>(
    PUBLIC_FINANCE_SETTINGS,
    { fetchPolicy: 'cache-first' },
  );
  const breakdown = request?.breakdown;
  if (!breakdown) return null;

  const sym = settings.data?.publicFinanceSettings?.currency_symbol ?? '';
  const lines = breakdown.version >= 2
    ? buildV2Lines(breakdown, request.kind, sym)
    : buildV1Lines(breakdown, sym);

  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        Settlement breakdown
      </Typography>
      <Stack spacing={0.5} sx={{ mt: 1 }} divider={<Divider flexItem />}>
        {lines.map((line) => (
          <Stack key={line.key} direction="row" justifyContent="space-between">
            <Typography variant="body2" fontWeight={line.bold ? 700 : 400}>{line.label}</Typography>
            <Typography variant="body2" fontWeight={line.bold ? 700 : 400}>{line.value}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
