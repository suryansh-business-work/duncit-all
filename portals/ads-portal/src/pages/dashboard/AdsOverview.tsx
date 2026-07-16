import { useQuery } from '@apollo/client';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import { format } from 'date-fns';
import { QueryGuard } from '@duncit/ui';
import StatGrid from './StatGrid';
import RecentAdsTable from './RecentAdsTable';
import { MY_ADS_DASHBOARD, type AdsDashboardStats } from './queries';

const CREATE_AD_PATH = '/ads/new';

function NextStartHint({ stats }: Readonly<{ stats: AdsDashboardStats }>) {
  if (!stats.next_start_at) return null;
  const when = format(new Date(stats.next_start_at), "EEE, d MMM yyyy 'at' h:mm a");
  return (
    <Alert severity="info" icon={<RocketLaunchOutlinedIcon fontSize="inherit" />}>
      Next ad goes live: <strong>{stats.next_start_title}</strong> on {when}.
    </Alert>
  );
}

/** Friendly zero-ads state for a brand-new advertiser. */
function EmptyState() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={1.5} alignItems="center" sx={{ py: 4, textAlign: 'center' }}>
          <CampaignOutlinedIcon color="primary" sx={{ fontSize: 48 }} />
          <Typography variant="subtitle1" fontWeight={700}>
            No ads yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            Submit your first ad request — you get an instant cost estimate, and the Marketing
            team confirms the final price on approval.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to={CREATE_AD_PATH}
          >
            Create your first ad
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function RecentSection() {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Recent requests
        </Typography>
        <Button component={RouterLink} to="/ads" size="small">
          View all
        </Button>
      </Stack>
      <RecentAdsTable />
    </Box>
  );
}

function OverviewBody({ stats }: Readonly<{ stats: AdsDashboardStats }>) {
  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        useFlexGap
        flexWrap="wrap"
        sx={{ gap: 1 }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Ads overview
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to={CREATE_AD_PATH}>
          Create Ad
        </Button>
      </Stack>
      <NextStartHint stats={stats} />
      <StatGrid stats={stats} />
      {stats.total === 0 ? <EmptyState /> : <RecentSection />}
    </Stack>
  );
}

/** The Ads portal home: live advertiser KPIs + the latest requests. */
export default function AdsOverview() {
  const { data, loading, error } = useQuery<{ myAdsDashboard: AdsDashboardStats }>(
    MY_ADS_DASHBOARD,
    { fetchPolicy: 'cache-and-network' },
  );
  const stats = data?.myAdsDashboard;

  return (
    <QueryGuard loading={loading && !stats} error={error} notFound={!stats}>
      {() => (stats ? <OverviewBody stats={stats} /> : null)}
    </QueryGuard>
  );
}
