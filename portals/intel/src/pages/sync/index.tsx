import { useQuery } from '@apollo/client/react';
import { Alert, Button, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { fireAndForget } from '@duncit/logs';
import { EmptyState, PageHeader } from '@duncit/ui';
import { useNavigate } from 'react-router';
import { useBootstrap } from '../../components/IntelBootstrap';
import { INTEL_CONNECTORS, INTEL_SYNC_RUNS, type ConnectorsData, type SyncRunsData } from '../../graphql/admin';
import { intelLog } from '../../lib/logger';
import ConnectorFreshness from './ConnectorFreshness';
import SyncRunsTable from './SyncRunsTable';

const POLL_MS = 15_000;

/** Freshness and health of every connector, and every recent sync run (refreshed every 15 s). */
export default function SyncPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: boot } = useBootstrap();
  const connectors = useQuery<ConnectorsData>(INTEL_CONNECTORS, { pollInterval: POLL_MS, skip: !boot?.me.can_admin });
  const runs = useQuery<SyncRunsData>(INTEL_SYNC_RUNS, { variables: { limit: 100 }, pollInterval: POLL_MS, skip: !boot?.me.can_admin });
  const refresh = () => {
    fireAndForget(connectors.refetch(), intelLog, '/sync', 'SyncPage');
    fireAndForget(runs.refetch(), intelLog, '/sync', 'SyncPage');
  };
  if (boot && !boot.me.can_admin) return <EmptyState title={t('intel.common.adminOnly')} />;
  const list = connectors.data?.intelConnectors ?? [];

  return (
    <Stack spacing={2}>
      <PageHeader title={t('intel.sync.title')} subtitle={t('intel.sync.subtitle')} />
      {(connectors.error || runs.error) && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={refresh}>{t('intel.common.retry')}</Button>}>
          {t('intel.sync.loadFailed')}
        </Alert>
      )}
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>{t('intel.sync.connectors')}</Typography>
      {connectors.loading && !connectors.data && <Skeleton variant="rounded" height={140} />}
      {connectors.data && list.length === 0 && <EmptyState title={t('intel.sync.noConnectors')} action={<Button variant="contained" onClick={() => navigate('/setting/database')}>{t('intel.sync.addConnector')}</Button>} />}
      <Grid container spacing={1.5}>
        {list.map((c) => (
          <Grid key={c.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <ConnectorFreshness connector={c} onChanged={refresh} />
          </Grid>
        ))}
      </Grid>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>{t('intel.sync.runs')}</Typography>
      {runs.loading && !runs.data ? <Skeleton variant="rounded" height={240} /> : <SyncRunsTable runs={runs.data?.intelSyncRuns ?? []} />}
    </Stack>
  );
}
