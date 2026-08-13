import { useQuery } from '@apollo/client';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, Chip, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import WorkIcon from '@mui/icons-material/Work';
import { formatMoney } from '@duncit/utils';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import HostStatCards from './HostStatCards';
import HostInsightsCharts from './HostInsightsCharts';
import HostHealthCard from './HostHealthCard';
import {
  HOST_DASHBOARD,
  HOST_INSIGHTS,
  emptyHostEarnings,
  emptyStatusCounts,
  type HostAccountHealth,
  type HostEarningsSummary,
  type HostInsights,
  type HostWallet,
} from './queries';

/** The dark banner that heads every partner console. Not a widget: it carries
 *  the page's identity and its balance, which nobody wants to lose behind a
 *  chart they dragged up. */
const HERO_SX = {
  p: { xs: 2, md: 3 },
  borderRadius: 3,
  color: '#fff',
  background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)',
} as const;

function QuickActions({ isHost }: Readonly<{ isHost: boolean }>) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
      <Button component={RouterLink} to="/host/pods" size="small" variant="outlined" startIcon={<DashboardIcon />}>
        Your Pods
      </Button>
      <Button
        component={RouterLink}
        to="/wallet"
        size="small"
        variant="outlined"
        startIcon={<AccountBalanceWalletIcon />}
      >
        Wallet
      </Button>
      <Button
        component={RouterLink}
        to="/host/pods?new=1"
        size="small"
        variant="contained"
        startIcon={<AddIcon />}
        disabled={!isHost}
      >
        Create pod
      </Button>
    </Stack>
  );
}

/**
 * Host > Dashboard — the portal twin of the app's HostDashboardScreen
 * (rule 27): balance, earnings + pod tiles, quick actions, insights and the
 * profile-health card, off the same queries.
 */
export default function HostDashboardPage() {
  const dashboardQuery = useQuery(HOST_DASHBOARD, { fetchPolicy: 'cache-and-network' });
  const insightsQuery = useQuery(HOST_INSIGHTS, {
    variables: { months: 12 },
    fetchPolicy: 'cache-and-network',
  });

  const me = dashboardQuery.data?.me;
  const wallet: HostWallet | null = dashboardQuery.data?.myWallet ?? null;
  const earnings: HostEarningsSummary = dashboardQuery.data?.myHostEarningsSummary ?? emptyHostEarnings;
  const health: HostAccountHealth | null = dashboardQuery.data?.myAccountHealth ?? null;
  const insights: HostInsights | null = insightsQuery.data?.hostInsights ?? null;
  const isHost = (me?.roles ?? []).includes('HOST');
  const currency = wallet?.currency_symbol ?? earnings.currency_symbol;
  const loading = dashboardQuery.loading && !dashboardQuery.data;
  const greeting = me?.full_name ? `Welcome back, ${me.full_name}` : 'Earnings from your hosted pods';

  const widgets: DashboardWidget[] = [
    {
      id: 'stat-cards',
      bare: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: (
        <HostStatCards
          earnings={earnings}
          counts={insights?.status_counts ?? emptyStatusCounts}
          loading={loading}
        />
      ),
    },
    {
      id: 'quick-actions',
      title: 'Quick actions',
      defaultLayout: { x: 0, y: 2, w: 12, h: 2 },
      minH: 2,
      content: <QuickActions isHost={isHost} />,
    },
    {
      id: 'insights',
      bare: true,
      defaultLayout: { x: 0, y: 4, w: 12, h: 7 },
      minW: 4,
      minH: 4,
      content: <HostInsightsCharts insights={insights} currencySymbol={currency} />,
    },
    {
      id: 'health',
      bare: true,
      defaultLayout: { x: 0, y: 11, w: 12, h: 4 },
      minW: 4,
      minH: 3,
      content: <HostHealthCard health={health} podsCompleted={earnings.pods_completed} />,
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="partners.host"
      header={
        <Stack spacing={2.5}>
          <Card sx={HERO_SX}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 800 }}>
                  Partner tools · Host
                </Typography>
                <Typography variant="h5" fontWeight={950}>
                  Host Dashboard
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  {greeting}
                </Typography>
              </Box>
              <Box sx={{ textAlign: { md: 'right' } }}>
                <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 800 }}>
                  AVAILABLE BALANCE
                </Typography>
                <Typography variant="h4" fontWeight={950}>
                  {formatMoney(wallet?.balance ?? 0, { symbol: currency })}
                </Typography>
                {isHost && <Chip size="small" label="HOST" color="success" sx={{ fontWeight: 900 }} />}
              </Box>
            </Stack>
          </Card>

          {dashboardQuery.error && <Alert severity="error">{dashboardQuery.error.message}</Alert>}
          {insightsQuery.error && <Alert severity="error">{insightsQuery.error.message}</Alert>}

          {!isHost && (
            <Alert
              severity="info"
              action={
                <Button component={RouterLink} to="/become-host" size="small" startIcon={<WorkIcon />}>
                  Apply
                </Button>
              }
            >
              You are not an approved host yet. Submit your host profile to start creating pods.
            </Alert>
          )}
        </Stack>
      }
      widgets={widgets}
    />
  );
}
