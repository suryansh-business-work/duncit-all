import { useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { subDays, subMonths, startOfMonth } from 'date-fns';
import { useApolloTableFetch } from '@duncit/table';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import {
  CLUB_ADMIN_DASHBOARD,
  CLUB_ADMIN_DASHBOARD_TABLE,
  emptyClubAdminDashboard,
  type ClubAdminClubRow,
  type ClubAdminDashboard,
} from './queries';
import ClubAdminKpiCards from './ClubAdminKpiCards';
import ClubAdminTrendChart from './ClubAdminTrendChart';
import ClubAdminClubsTable from './ClubAdminClubsTable';
import { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

const ranges = (t: Translate) =>[
  { value: '30d', label: t('partners.clubAdminDashboardPage.last30Days'), from: () => subDays(new Date(), 30) },
  { value: 'month', label: t('partners.clubAdminDashboardPage.thisMonth'), from: () => startOfMonth(new Date()) },
  { value: '12m', label: t('partners.clubAdminDashboardPage.last12Months'), from: () => subMonths(new Date(), 12) },
  { value: 'all', label: t('partners.clubAdminDashboardPage.allTime'), from: () => null },
];

const HERO_SX = {
  p: { xs: 2, md: 3 },
  borderRadius: 3,
  color: '#fff',
  background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)',
} as const;

const RANGE_SX = {
  minWidth: 200,
  '& .MuiInputBase-root, & .MuiInputLabel-root': { color: '#fff' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
  '& .MuiSvgIcon-root': { color: '#fff' },
} as const;

export default function ClubAdminDashboardPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState('12m');
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const from = useMemo(() => {
    const start = ranges(t).find((item) => item.value === range)?.from() ?? null;
    return start ? start.toISOString() : null;
  }, [range]);

  const { data, loading, error } = useQuery<any>(CLUB_ADMIN_DASHBOARD, {
    variables: { from, to: null },
    fetchPolicy: 'cache-and-network',
  });

  const fetchRows = useApolloTableFetch<ClubAdminClubRow>(
    client,
    CLUB_ADMIN_DASHBOARD_TABLE,
    'clubAdminDashboardTable',
    { extraVariables: { from, to: null } },
    [from],
  );

  // The table only refetches on its own query-state changes — reload it when the
  // page-level range select swaps the `from` boundary (skip the mount fetch).
  const rangeMounted = useRef(false);
  useEffect(() => {
    if (!rangeMounted.current) {
      rangeMounted.current = true;
      return;
    }
    refetchRef.current?.();
  }, [from]);

  const dashboard: ClubAdminDashboard = data?.clubAdminDashboard ?? emptyClubAdminDashboard;

  const widgets: DashboardWidget[] = [
    {
      id: 'kpis',
      bare: true,
      // Four titled KPI groups (~700px) — an h2 window hides almost all of it
      // behind a nested scrollbar.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <ClubAdminKpiCards kpis={dashboard.kpis} loading={loading && !data} />,
    },
    {
      id: 'trend',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 0, y: 2, w: 12, h: 6 },
      minW: 4,
      // minH floors the measured height — keep it low or empty states pin a void.
      minH: 2,
      content: <ClubAdminTrendChart trend={dashboard.trend} />,
    },
    {
      id: 'clubs-table',
      bare: true,
      defaultLayout: { x: 0, y: 8, w: 12, h: 8 },
      minW: 4,
      minH: 4,
      content: (
        <ClubAdminClubsTable
          fetchRows={fetchRows}
          refetchRef={refetchRef}
          currencySymbol={dashboard.kpis.currency_symbol}
        />
      ),
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="partners.clubAdmin"
      header={
        <Stack spacing={2.5}>
          <Card sx={HERO_SX}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{
              alignItems: { md: 'center' }
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 800 }}>{t('partners.clubAdminDashboardPage.partnerToolsClubAdmin')}</Typography>
                <Typography variant="h5" sx={{
                  fontWeight: 950
                }}>{t('partners.clubAdminDashboardPage.clubAdminDashboard')}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  Pods, bookings, community and revenue across every club you administer.
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                label={t('partners.clubAdminDashboardPage.range')}
                value={range}
                onChange={(event) => setRange(event.target.value)}
                sx={RANGE_SX}
              >
                {ranges(t).map((item) => (
                  <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Card>

          {error && <Alert severity="error">{error.message}</Alert>}
        </Stack>
      }
      widgets={widgets}
    />
  );
}
