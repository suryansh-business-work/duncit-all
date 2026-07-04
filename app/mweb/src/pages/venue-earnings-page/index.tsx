import { useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import StatCards from './StatCards';
import PayoutList, { type VenuePayout } from './PayoutList';
import { VENUE_EARNINGS } from './queries';

/** Venue Earnings — myVenueEarningsSummary stat cards + payout history across
 * every venue the signed-in owner has (Pod Finance Breakdown epic). */
export default function VenueEarningsPage() {
  const { data, loading, error } = useQuery(VENUE_EARNINGS, { fetchPolicy: 'cache-and-network' });

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const summary = data?.myVenueEarningsSummary;
  const payouts: VenuePayout[] = data?.myVenuePayouts ?? [];
  const symbol = summary?.currency_symbol ?? '₹';

  let history;
  if (payouts.length === 0) {
    history = <Alert severity="info">Payouts appear here after a pod at your venue completes.</Alert>;
  } else {
    history = <PayoutList payouts={payouts} symbol={symbol} />;
  }

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={{ width: 38, height: 38, borderRadius: 3, display: 'grid', placeItems: 'center', color: 'common.white', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <PaidIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
            Earnings
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            Your venue payouts across all pods
          </Typography>
        </Box>
      </Stack>

      {summary && <StatCards summary={summary} />}

      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 950 }}>
              Payout history
            </Typography>
            <Chip size="small" label={payouts.length} />
          </Stack>
          <Divider sx={{ mb: 1.5 }} />
          {history}
        </CardContent>
      </Card>
    </Stack>
  );
}
