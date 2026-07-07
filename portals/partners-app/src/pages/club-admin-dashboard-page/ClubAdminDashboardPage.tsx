import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { subDays, subMonths, startOfMonth } from 'date-fns';
import { CLUB_ADMIN_DASHBOARD, emptyClubAdminDashboard, type ClubAdminDashboard } from './queries';
import ClubAdminKpiCards from './ClubAdminKpiCards';
import ClubAdminTrendChart from './ClubAdminTrendChart';
import ClubAdminClubsTable from './ClubAdminClubsTable';

const RANGES = [
  { value: '30d', label: 'Last 30 days', from: () => subDays(new Date(), 30) },
  { value: 'month', label: 'This month', from: () => startOfMonth(new Date()) },
  { value: '12m', label: 'Last 12 months', from: () => subMonths(new Date(), 12) },
  { value: 'all', label: 'All time', from: () => null },
];

export default function ClubAdminDashboardPage() {
  const [range, setRange] = useState('12m');

  const from = useMemo(() => {
    const start = RANGES.find((item) => item.value === range)?.from() ?? null;
    return start ? start.toISOString() : null;
  }, [range]);

  const { data, loading, error } = useQuery(CLUB_ADMIN_DASHBOARD, {
    variables: { from, to: null },
    fetchPolicy: 'cache-and-network',
  });

  const dashboard: ClubAdminDashboard = data?.clubAdminDashboard ?? emptyClubAdminDashboard;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 800 }}>Partner tools · Club Admin</Typography>
            <Typography variant="h5" fontWeight={950}>Club Admin Dashboard</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Pods, bookings, community and revenue across every club you administer.
            </Typography>
          </Box>
          <TextField
            select
            size="small"
            label="Range"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            sx={{
              minWidth: 200,
              '& .MuiInputBase-root, & .MuiInputLabel-root': { color: '#fff' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
              '& .MuiSvgIcon-root': { color: '#fff' },
            }}
          >
            {RANGES.map((item) => (
              <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {error && <Alert severity="error">{error.message}</Alert>}

      <ClubAdminKpiCards kpis={dashboard.kpis} loading={loading && !data} />
      <ClubAdminTrendChart trend={dashboard.trend} />
      <ClubAdminClubsTable clubs={dashboard.clubs} currencySymbol={dashboard.kpis.currency_symbol} />
    </Stack>
  );
}
