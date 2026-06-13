import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import SimpleBarChart, { buildMonthlyCounts } from '../../components/SimpleBarChart';
import HealthMeter, { type HealthBand } from '../../components/health/HealthMeter';
import EarningsCard from './EarningsCard';
import QuickActions from './QuickActions';
import { HOST_DASHBOARD_ME, HOST_DASHBOARD_PODS } from './queries';

const bandHint = (band?: HealthBand) => {
  if (band === 'GREEN') return 'Your host profile is in great shape.';
  if (band === 'YELLOW') return 'A few profile + verification items to tighten up.';
  return 'Complete your profile and verification to host with trust.';
};

/** Host Dashboard — earnings, pod stats, quick actions and profile/verification
 * health. Split out from "Your Pods" (which is now just the pods list). B2-#5. */
export default function HostDashboardPage() {
  const navigate = useNavigate();
  const meQ = useQuery(HOST_DASHBOARD_ME, { fetchPolicy: 'cache-and-network' });
  const userId = meQ.data?.me?.user_id;
  const podsQ = useQuery(HOST_DASHBOARD_PODS, {
    variables: { host_user_id: userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });

  if (meQ.loading && !meQ.data) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (meQ.error) return <Alert severity="error">{meQ.error.message}</Alert>;

  const wallet = meQ.data?.myWallet;
  const health = meQ.data?.myAccountHealth;
  const pods = podsQ.data?.pods ?? [];
  const loadingPods = !!userId && podsQ.loading && !podsQ.data;
  const upcoming = pods.filter(
    (p: any) => p.pod_date_time && new Date(p.pod_date_time).getTime() > Date.now(),
  ).length;
  const paid = pods.filter((p: any) => !p.pod_type?.includes('FREE')).length;
  const stats = [
    { label: 'Pods', value: loadingPods ? '—' : pods.length },
    { label: 'Upcoming', value: loadingPods ? '—' : upcoming },
    { label: 'Paid', value: loadingPods ? '—' : paid },
  ];

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={{ width: 38, height: 38, borderRadius: 3, display: 'grid', placeItems: 'center', color: 'common.white', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <SpaceDashboardIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
            Dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            {meQ.data?.me?.full_name ? `Welcome back, ${meQ.data.me.full_name}` : 'Your host overview'}
          </Typography>
        </Box>
      </Stack>

      <EarningsCard
        balance={wallet?.balance ?? 0}
        currency={wallet?.currency_symbol ?? '₹'}
        nextPayoutAt={wallet?.next_payout_at}
      />

      <Stack direction="row" spacing={1}>
        {stats.map((item) => (
          <Card key={item.label} variant="outlined" sx={{ flex: 1, borderRadius: 3 }}>
            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 950 }} noWrap>
                {item.label}
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.35, fontWeight: 950 }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <QuickActions />

      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
            Pods by month
          </Typography>
          <SimpleBarChart data={buildMonthlyCounts(pods.map((p: any) => p.pod_date_time))} />
        </CardContent>
      </Card>

      {health && (
        <Card variant="outlined" sx={{ borderRadius: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <HealthMeter
                score={health.total_score}
                band={health.band}
                size={130}
                label="Profile health"
                onClick={() => navigate('/account/health')}
                caption="Tap for details"
              />
              <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                  {bandHint(health.band)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Keep your profile and verification up to date to rank higher with guests.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
