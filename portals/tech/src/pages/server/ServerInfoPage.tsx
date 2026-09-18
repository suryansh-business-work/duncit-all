import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import ServerInfoDetails from './ServerInfoDetails';
import ServerStatCard from './ServerStatCard';
import ServerHistoryPanel from './history';
import ContainerUsage from './history/ContainerUsage';
import ServerAdviceCard from './advice';
import LivePulse from '../stress-testing/components/LivePulse';
import { formatBytes, formatUptime } from './format';
import { SERVER_INFO, apiHost, type ServerInfo } from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

/** A full-width card that sizes itself to its content. */
const panel = (id: string, y: number, content: DashboardWidget['content']): DashboardWidget => ({
  id,
  bare: true,
  fitContent: true,
  defaultLayout: { x: 0, y, w: 12, h: 6 },
  minW: 4,
  minH: 3,
  content,
});

function buildWidgets(info: ServerInfo, t: Translate): DashboardWidget[] {
  const tile = (id: string, x: number, content: DashboardWidget['content']): DashboardWidget => ({
    id,
    bare: true,
    defaultLayout: { x, y: 0, w: 3, h: 2 },
    minW: 2,
    minH: 2,
    content,
  });

  return [
    tile('cpu', 0, (
      <ServerStatCard
        label={t('tech.server.cpuUsage')}
        value={`${info.cpu.usagePercent}%`}
        sub={t('tech.server.coresCount', { vars: { count: info.cpu.cores } })}
        percent={info.cpu.usagePercent}
      />
    )),
    tile('memory', 3, (
      <ServerStatCard
        label={t('tech.server.memoryTile')}
        value={formatBytes(info.memory.usedBytes)}
        sub={t('tech.server.ofTotal', { vars: { total: formatBytes(info.memory.totalBytes) } })}
        percent={info.memory.usagePercent}
      />
    )),
    tile('disk', 6, (
      <ServerStatCard
        label={t('tech.server.diskTile')}
        value={formatBytes(info.disk.usedBytes)}
        sub={t('tech.server.ofTotal', { vars: { total: formatBytes(info.disk.totalBytes) } })}
        percent={info.disk.usagePercent}
      />
    )),
    tile('uptime', 9, (
      <ServerStatCard
        label={t('tech.server.uptimeTile')}
        value={formatUptime(info.os.kernelUptimeSeconds)}
        sub={info.os.distro}
      />
    )),
    // Widgets added after someone saved a layout land at the bottom of their
    // grid (see @duncit/dashboard), so the ids below must never be renamed.
    panel('pulse', 2, <LivePulse />),
    panel('history', 8, <ServerHistoryPanel />),
    panel('advice', 14, <ServerAdviceCard />),
    {
      id: 'details',
      bare: true,
      // Two columns of natural-height panels that stack to one below md — the
      // h8 default only fits the two-column shape by coincidence.
      fitContent: true,
      defaultLayout: { x: 0, y: 20, w: 12, h: 8 },
      minW: 4,
      minH: 4,
      content: <ServerInfoDetails info={info} />,
    },
    panel('containers', 28, <ContainerUsage />),
  ];
}

export default function ServerInfoPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ techServerInfo: ServerInfo }>(SERVER_INFO, {
    variables: { sslHost: apiHost() },
    fetchPolicy: 'cache-and-network',
  });
  const info = data?.techServerInfo;

  const header = (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      <DnsIcon color="primary" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h5" component="h1" sx={{
          fontWeight: 800
        }}>
          {t('tech.server.infoTitle')}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('tech.server.infoSubtitle')}
        </Typography>
      </Box>
      <DuncitButton
        size="small"
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={() => refetch()}
        disabled={loading}
      >
        {t('tech.server.refresh')}
      </DuncitButton>
    </Stack>
  );

  if (!info) {
    return (
      <Stack spacing={2.5}>
        {header}
        {error && (
          <Alert severity="error">{t('tech.server.loadError', { vars: { message: error.message } })}</Alert>
        )}
        {loading && (
          <Stack
            sx={{
              alignItems: "center",
              py: 6
            }}>
            <CircularProgress />
          </Stack>
        )}
      </Stack>
    );
  }

  return <DuncitDashboard dashboardId="tech.serverInfo" header={header} widgets={buildWidgets(info, t)} />;
}
