import { useQuery } from '@apollo/client';
import { Chip, Divider, Stack, Typography } from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import { FinanceWaterfallList, buildWaterfallLines } from '../../components/finance-waterfall';
import SectionCard from './SectionCard';
import { POD_FINANCE_BREAKDOWN } from './queries';

type SettlementStatus = 'LIVE' | 'PENDING_APPROVAL' | 'SETTLED';

const STATUS_CHIPS: Record<SettlementStatus, { label: string; color: 'info' | 'warning' | 'success' }> = {
  LIVE: { label: 'Live', color: 'info' },
  PENDING_APPROVAL: { label: 'Pending approval', color: 'warning' },
  SETTLED: { label: 'Settled', color: 'success' },
};

/** One label/value line of the summary above the waterfall. */
function SummaryRow({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}

/** "Finance" card on the pod detail page: settlement status + money waterfall. */
export default function PodFinanceSection({ podId }: Readonly<{ podId: string }>) {
  const { data, loading, error } = useQuery(POD_FINANCE_BREAKDOWN, {
    variables: { pod_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const breakdown = data?.podFinanceBreakdown;
  const statusChip = breakdown ? STATUS_CHIPS[breakdown.settlement_status as SettlementStatus] : null;

  const lines = breakdown
    ? buildWaterfallLines(
        breakdown.waterfall,
        breakdown.currency_symbol,
        breakdown.has_venue,
        breakdown.collected_total
      )
    : [];

  return (
    <SectionCard
      icon={<PaidIcon fontSize="small" />}
      title="Finance"
      tone="success"
      loading={loading && !breakdown}
      error={error ? 'Finance breakdown is not available for this pod.' : null}
      empty={!error && !loading && !breakdown ? 'No settlement recorded for this pod yet.' : null}
      action={
        breakdown && (
          <Stack direction="row" spacing={1}>
            {statusChip && <Chip size="small" label={statusChip.label} color={statusChip.color} />}
            {breakdown.frozen && <Chip size="small" label="Frozen snapshot" variant="outlined" />}
          </Stack>
        )
      }
    >
      {breakdown && (
        <Stack spacing={1.25}>
          <SummaryRow label="Bookings" value={breakdown.bookings_count} />
          <SummaryRow
            label="Collected total"
            value={`${breakdown.currency_symbol}${breakdown.collected_total.toFixed(2)}`}
          />
          <Divider />
          <FinanceWaterfallList symbol={breakdown.currency_symbol} lines={lines} />
          <Typography variant="caption" color="text.secondary">
            Payouts are released after Finance approval.
          </Typography>
        </Stack>
      )}
    </SectionCard>
  );
}
