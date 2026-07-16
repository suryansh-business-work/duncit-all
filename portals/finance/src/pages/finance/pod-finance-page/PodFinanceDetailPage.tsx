import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { QueryGuard } from '@duncit/ui';
import HostEarningsCard from './HostEarningsCard';
import SettlementStatusChip, { FrozenBadge } from './SettlementStatusChip';
import WaterfallAccordions from './WaterfallAccordions';
import { POD_FINANCE_BREAKDOWN, money, type PodFinanceBreakdown } from './queries';

function PodFinanceDetail({ breakdown }: Readonly<{ breakdown: PodFinanceBreakdown }>) {
  const navigate = useNavigate();
  const sym = breakdown.currency_symbol;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <IconButton aria-label="Back to Pod Finance" onClick={() => navigate('/pod-finance')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="h5" fontWeight={700}>{breakdown.pod_title}</Typography>
            <SettlementStatusChip status={breakdown.settlement_status} />
            {breakdown.frozen && <FrozenBadge />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {breakdown.bookings_count} bookings · Customer paid {money(sym, breakdown.collected_total)}
            {breakdown.completed_at ? ` · Completed ${new Date(breakdown.completed_at).toLocaleString()}` : ''}
          </Typography>
        </Box>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Card variant="outlined" sx={{ borderRadius: 3, flex: 2, width: '100%' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              Money Waterfall
            </Typography>
            <WaterfallAccordions breakdown={breakdown} />
          </CardContent>
        </Card>
        <Box sx={{ flex: 1, width: '100%' }}>
          <HostEarningsCard breakdown={breakdown} />
        </Box>
      </Stack>
    </Box>
  );
}

export default function PodFinanceDetailPage() {
  const { podId } = useParams<{ podId: string }>();
  const { data, loading, error } = useQuery<{ podFinanceBreakdown: PodFinanceBreakdown }>(
    POD_FINANCE_BREAKDOWN,
    { variables: { podId }, fetchPolicy: 'cache-and-network', skip: !podId },
  );

  const breakdown = data?.podFinanceBreakdown;

  return (
    <QueryGuard
      loading={loading && !breakdown}
      error={error}
      notFound={!breakdown}
      notFoundText="Pod finance breakdown not found."
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => <PodFinanceDetail breakdown={breakdown!} />}
    </QueryGuard>
  );
}
