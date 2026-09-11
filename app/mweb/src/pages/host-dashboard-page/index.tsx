import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, CircularProgress, Stack } from '@mui/material';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import StudioPageHeader from '../../components/StudioPageHeader';
import EarningsCard from './EarningsCard';
import QuickActions from './QuickActions';
import HostInsights from './HostInsights';
import HealthRow from './HealthRow';
import StatCard from './StatCard';
import { HOST_DASHBOARD_ME, HOST_DASHBOARD_PODS } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/** Host Dashboard — earnings, pod stats, quick actions and profile/verification
 * health. Split out from "Your Pods" (which is now just the pods list). B2-#5. */
export default function HostDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const meQ = useQuery<any>(HOST_DASHBOARD_ME, { fetchPolicy: 'cache-and-network' });
  const userId = meQ.data?.me?.user_id;
  const podsQ = useQuery<any>(HOST_DASHBOARD_PODS, {
    variables: { host_user_id: userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });

  if (meQ.loading && !meQ.data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 8
        }}>
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
  const paid = pods.filter((p: any) => p.pod_type !== 'FREE').length;
  const stats = [
    { label: t('mweb.hostDashboard.pods'), value: loadingPods ? '—' : pods.length },
    { label: t('mweb.common.upcoming'), value: loadingPods ? '—' : upcoming },
    { label: t('mweb.common.paid'), value: loadingPods ? '—' : paid },
  ];

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader
        icon={<SpaceDashboardIcon fontSize="small" />}
        title={t('mweb.hostDashboard.dashboard')}
      />

      <EarningsCard
        balance={wallet?.balance ?? 0}
        currency={wallet?.currency_symbol ?? '₹'}
        nextPayoutAt={wallet?.next_payout_at}
        summary={meQ.data?.myHostEarningsSummary}
      />

      <Stack direction="row" spacing={1.5}>
        {stats.map((item) => (
          <StatCard key={item.label} label={item.label} value={String(item.value)} size="lg" />
        ))}
      </Stack>

      <QuickActions />

      <HostInsights pods={pods} currency={wallet?.currency_symbol ?? '₹'} />

      {health && (
        <HealthRow
          score={health.total_score}
          band={health.band}
          label={t('mweb.hostDashboard.profileHealth')}
          ariaLabel={t('mweb.hostDashboard.viewProfileHealth')}
          onOpen={() => navigate('/account/health')}
        />
      )}
    </Stack>
  );
}
