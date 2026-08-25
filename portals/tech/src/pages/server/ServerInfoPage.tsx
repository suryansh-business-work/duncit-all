import { useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import RefreshIcon from '@mui/icons-material/Refresh';
import { StatCard } from '@duncit/ui';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import ServerInfoDetails from './ServerInfoDetails';
import { formatBytes, formatUptime } from './format';
import { SERVER_INFO, apiHost, type ServerInfo } from './queries';
import { useTranslation } from '@duncit/app-settings';

/** The shared StatCard styled exactly like the old local server tile. */
type Translate = ReturnType<typeof useTranslation>['t'];

function ServerStatCard(props: Readonly<{ label: string; value: string; sub?: string; percent?: number }>) {
  return (
    <StatCard
      {...props}
      labelVariant="caption"
      labelWeight={700}
      labelSx={{ letterSpacing: 0.3 }}
      valueNoWrap
      sx={{ height: '100%' }}
    />
  );
}

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
        sub={`${info.cpu.cores} cores`}
        percent={info.cpu.usagePercent}
      />
    )),
    tile('memory', 3, (
      <ServerStatCard
        label="MEMORY"
        value={formatBytes(info.memory.usedBytes)}
        sub={`/ ${formatBytes(info.memory.totalBytes)}`}
        percent={info.memory.usagePercent}
      />
    )),
    tile('disk', 6, (
      <ServerStatCard
        label="DISK"
        value={formatBytes(info.disk.usedBytes)}
        sub={`/ ${formatBytes(info.disk.totalBytes)}`}
        percent={info.disk.usagePercent}
      />
    )),
    tile('uptime', 9, (
      <ServerStatCard
        label="UPTIME"
        value={formatUptime(info.os.kernelUptimeSeconds)}
        sub={info.os.distro}
      />
    )),
    {
      id: 'details',
      bare: true,
      // Two columns of natural-height panels that stack to one below md — the
      // h8 default only fits the two-column shape by coincidence.
      fitContent: true,
      defaultLayout: { x: 0, y: 2, w: 12, h: 8 },
      minW: 4,
      minH: 4,
      content: <ServerInfoDetails info={info} />,
    },
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
        <Typography variant="h5" sx={{
          fontWeight: 800
        }}>
          Server · Info
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Live metrics for the host running the API — CPU, memory, storage, uptime, SSH and SSL.
        </Typography>
      </Box>
      <Button
        size="small"
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={() => refetch()}
        disabled={loading}
      >
        Refresh
      </Button>
    </Stack>
  );

  if (!info) {
    return (
      <Stack spacing={2.5}>
        {header}
        {error && <Alert severity="error">Could not load server info: {error.message}</Alert>}
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
