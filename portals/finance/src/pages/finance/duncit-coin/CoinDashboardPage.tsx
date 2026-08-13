import { useQuery } from '@apollo/client';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useSearchParams } from 'react-router-dom';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import CoinMonthlyChart from './CoinMonthlyChart';
import CoinStatTiles from './CoinStatTiles';
import { COIN_ADMIN_STATS, coinCount, type CoinAdminStats } from './queries';

/** Window options for the distribution chart. The server clamps to 1..36. */
const MONTH_RANGES = [6, 12, 24, 36];

export default function CoinDashboardPage() {
  const [params, setParams] = useSearchParams();
  const months = Number(params.get('months')) || 12;

  const { data, loading, error } = useQuery(COIN_ADMIN_STATS, {
    variables: { months },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.coinAdminStats as CoinAdminStats | undefined;

  // The ledger and the per-user balances are two independent reads of the same
  // number. They should agree; when they do not, that is worth saying out loud
  // rather than quietly picking one.
  const drift = stats ? stats.total_outstanding - stats.wallet_balance_total : 0;

  const widgets: DashboardWidget[] = [
    {
      id: 'coin-tiles',
      bare: true,
      // Seven tiles at four per row always wrap — h2 shows one cut row.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <CoinStatTiles stats={stats} loading={loading} />,
    },
    {
      id: 'coin-monthly',
      bare: true,
      defaultLayout: { x: 0, y: 2, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <CoinMonthlyChart buckets={stats?.monthly ?? []} loading={loading} />,
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="finance.coin"
      header={
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <MonetizationOnIcon color="primary" />
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  Duncit Coin
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                How many coins the platform has granted, how many users have spent, and what is still
                outstanding. 1 coin = 1 {stats?.currency_symbol ?? '₹'} of reward value.
              </Typography>
            </Box>
            <TextField
              select
              size="small"
              label="Period"
              value={months}
              onChange={(e) => setParams({ months: e.target.value })}
              sx={{ minWidth: 180 }}
            >
              {MONTH_RANGES.map((option) => (
                <MenuItem key={option} value={option}>
                  Last {option} months
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {error && <Alert severity="error">{error.message}</Alert>}
          {drift !== 0 && (
            <Alert severity="warning">
              The ledger says {coinCount(stats?.total_outstanding ?? 0)} coins are outstanding, but user
              balances add up to {coinCount(stats?.wallet_balance_total ?? 0)} — a gap of{' '}
              {coinCount(Math.abs(drift))}. The ledger is the source of truth for the tiles below.
            </Alert>
          )}
        </Stack>
      }
      widgets={widgets}
    />
  );
}
