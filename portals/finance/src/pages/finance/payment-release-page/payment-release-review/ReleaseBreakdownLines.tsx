import { useQuery } from '@apollo/client';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { POD_COIN_TOTALS, PUBLIC_FINANCE_SETTINGS } from '../queries';

interface BreakdownLine {
  key: string;
  label: string;
  value: string;
  bold?: boolean;
}

const PARTY_LABEL_BY_KIND: Record<string, string> = {
  HOST_PAYMENT: 'Host amount (pool remainder)',
  CLUB_ADMIN: 'Club admin cut (off the pool)',
};

const buildV2Lines = (b: any, kind: string, sym: string): BreakdownLine[] => {
  const money = (n: number) => formatMoney(n, { symbol: sym, decimals: 2, grouping: false });
  const partyLabel = PARTY_LABEL_BY_KIND[kind] ?? 'Venue amount (booked slot price)';
  // Attendance is what the payout stands on: a pod settles on the seats a host
  // scanned in, so "collected" and "settled on" can legitimately differ. Both
  // are shown — a reviewer seeing only the smaller number would read a correct
  // payout as a shortfall. Frozen at completion, so a later scan cannot move it.
  const attendanceLines: BreakdownLine[] =
    Number(b.booked_seats || 0) > 0
      ? [
          {
            key: 'attendance',
            label: 'Attendance at completion',
            value: `${Number(b.attended_seats || 0)} of ${Number(b.booked_seats || 0)} seats`,
          },
          { key: 'attended-total', label: 'Settled on (attended seats)', value: money(b.attended_total) },
        ]
      : [];
  return [
    { key: 'collected', label: 'Customer collected', value: money(b.collected_total) },
    ...attendanceLines,
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
  const money = (n: number) => formatMoney(n, { symbol: sym, decimals: 2, grouping: false });
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
  // Read live rather than from the frozen snapshot: coins were never part of
  // the settlement record, and back-filling one would rewrite money history.
  // They explain the COLLECTED figure at the top of the waterfall — the pod
  // banked less than the tickets' face value because coins cut the gross.
  const coins = useQuery<{
    podFinanceBreakdown: { coins_redeemed_total: number; coins_earned_total: number };
  }>(POD_COIN_TOTALS, {
    variables: { podId: request?.pod_id },
    skip: !request?.pod_id,
    fetchPolicy: 'cache-first',
  });
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
      {coinsNote(coins.data?.podFinanceBreakdown)}
    </Box>
  );
}

/** One line naming both halves of the pod's coin movement, or nothing when the
 * pod never saw a coin — two zeroes under a settlement say less than silence. */
function coinsNote(totals?: { coins_redeemed_total: number; coins_earned_total: number }) {
  const spent = Math.max(0, Math.floor(Number(totals?.coins_redeemed_total) || 0));
  const earned = Math.max(0, Math.floor(Number(totals?.coins_earned_total) || 0));
  if (spent === 0 && earned === 0) return null;
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
      Duncit Coins on this pod: {spent} spent by buyers (already deducted from Customer collected)
      · {earned} earned back.
    </Typography>
  );
}
