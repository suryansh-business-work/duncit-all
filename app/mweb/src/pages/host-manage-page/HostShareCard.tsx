import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';

const MY_HOST_PAYOUTS = gql`
  query MyHostPayouts {
    myHostPayouts {
      id
      pod_title
      status
      amount_requested
      approved_amount
      breakdown {
        collected_total
        venue_bill
        gst_pct
        gst_amount
        duncit_pct
        duncit_amount
        payout_pct
        payout_amount
      }
      created_at
    }
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';
const STATUS_COLOR: Record<Status, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

function PayoutRow({ payout, symbol }: Readonly<{ payout: any; symbol: string }>) {
  const b = payout.breakdown;
  const fmt = (n: number) => `${symbol}${(Number(n) || 0).toFixed(2)}`;
  const lines = b
    ? [
        { label: 'Venue bill', value: b.venue_bill },
        { label: `GST (${b.gst_pct}%)`, value: b.gst_amount },
        { label: `Duncit Taken (${b.duncit_pct}%)`, value: b.duncit_amount },
      ]
    : [];
  const payable = payout.approved_amount ?? b?.payout_amount ?? payout.amount_requested;
  return (
    <Box sx={{ p: 1.25, borderRadius: 3, border: 1, borderColor: 'divider' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 800 }} noWrap>
          {payout.pod_title}
        </Typography>
        <Chip size="small" color={STATUS_COLOR[payout.status as Status] ?? 'default'} label={payout.status} />
      </Stack>
      <Stack spacing={0.25}>
        {lines.map((line) => (
          <Stack key={line.label} direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {line.label}
            </Typography>
            <Typography variant="caption">{fmt(line.value)}</Typography>
          </Stack>
        ))}
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 900 }}>
            Your Commission{b ? ` (${b.payout_pct}%)` : ''}
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 900 }}>
            {fmt(payable)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

/** "Host Share" — every completion payout this host has earned, with status. */
export default function HostShareCard() {
  const { data, loading, error } = useQuery(MY_HOST_PAYOUTS, { fetchPolicy: 'cache-and-network' });
  const payouts = data?.myHostPayouts ?? [];
  const symbol = data?.publicFinanceSettings?.currency_symbol ?? '₹';

  let body;
  if (loading && !data) {
    body = (
      <Stack alignItems="center" sx={{ py: 3 }}>
        <CircularProgress size={20} />
      </Stack>
    );
  } else if (error) {
    body = <Alert severity="error">{error.message}</Alert>;
  } else if (payouts.length === 0) {
    body = <Alert severity="info">Complete a pod to see your share here.</Alert>;
  } else {
    body = (
      <Stack spacing={1}>
        {payouts.map((p: any) => (
          <PayoutRow key={p.id} payout={p} symbol={symbol} />
        ))}
      </Stack>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 4 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <PaidIcon color="primary" />
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 950 }}>
            Host Share
          </Typography>
          <Chip size="small" label={payouts.length} />
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        {body}
      </CardContent>
    </Card>
  );
}
