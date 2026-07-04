import { useQuery } from '@apollo/client';
import { Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import { FinanceWaterfallList, buildWaterfallLines } from '../../components/finance-waterfall';
import { POD_FINANCE_BREAKDOWN } from './queries';

type SettlementStatus = 'LIVE' | 'PENDING_APPROVAL' | 'SETTLED';

const STATUS_CHIPS: Record<SettlementStatus, { label: string; color: 'info' | 'warning' | 'success' }> = {
  LIVE: { label: 'Live', color: 'info' },
  PENDING_APPROVAL: { label: 'Pending approval', color: 'warning' },
  SETTLED: { label: 'Settled', color: 'success' },
};

/** "Finance" card on the pod detail page: settlement status + money waterfall. */
export default function PodFinanceSection({ podId }: Readonly<{ podId: string }>) {
  const { data, loading, error } = useQuery(POD_FINANCE_BREAKDOWN, {
    variables: { pod_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const breakdown = data?.podFinanceBreakdown;

  if (error) {
    return (
      <Typography variant="caption" color="text.secondary">
        Finance breakdown is not available for this pod.
      </Typography>
    );
  }

  const statusChip = breakdown ? STATUS_CHIPS[breakdown.settlement_status as SettlementStatus] : null;

  const body = () => {
    if (!breakdown) {
      return loading ? (
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={20} />
        </Stack>
      ) : null;
    }
    const lines = buildWaterfallLines(
      breakdown.waterfall,
      breakdown.currency_symbol,
      breakdown.has_venue,
      breakdown.collected_total
    );
    return (
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {statusChip && <Chip size="small" label={statusChip.label} color={statusChip.color} />}
          {breakdown.frozen && <Chip size="small" label="Frozen snapshot" variant="outlined" />}
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Bookings
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {breakdown.bookings_count}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Collected total
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {breakdown.currency_symbol}
            {breakdown.collected_total.toFixed(2)}
          </Typography>
        </Stack>
        <Divider />
        <FinanceWaterfallList symbol={breakdown.currency_symbol} lines={lines} />
        <Typography variant="caption" color="text.secondary">
          Payouts are released after Finance approval.
        </Typography>
      </Stack>
    );
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <PaidIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={900}>
            Finance
          </Typography>
        </Stack>
        <Divider sx={{ mb: 1 }} />
        {body()}
      </CardContent>
    </Card>
  );
}
