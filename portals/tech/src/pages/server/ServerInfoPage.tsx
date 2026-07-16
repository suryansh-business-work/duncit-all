import { useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import RefreshIcon from '@mui/icons-material/Refresh';
import { StatCard } from '@duncit/ui';
import ServerInfoDetails from './ServerInfoDetails';
import { formatBytes, formatUptime } from './format';
import { SERVER_INFO, apiHost, type ServerInfo } from './queries';

/** The shared StatCard styled exactly like the old local server tile. */
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

export default function ServerInfoPage() {
  const { data, loading, error, refetch } = useQuery<{ techServerInfo: ServerInfo }>(SERVER_INFO, {
    variables: { sslHost: apiHost() },
    fetchPolicy: 'cache-and-network',
  });
  const info = data?.techServerInfo;

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <DnsIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>
            Server · Info
          </Typography>
          <Typography variant="body2" color="text.secondary">
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

      {error && !info && <Alert severity="error">Could not load server info: {error.message}</Alert>}

      {!info && loading && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}

      {info && (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            }}
          >
            <ServerStatCard label="CPU USAGE" value={`${info.cpu.usagePercent}%`} sub={`${info.cpu.cores} cores`} percent={info.cpu.usagePercent} />
            <ServerStatCard
              label="MEMORY"
              value={formatBytes(info.memory.usedBytes)}
              sub={`/ ${formatBytes(info.memory.totalBytes)}`}
              percent={info.memory.usagePercent}
            />
            <ServerStatCard
              label="DISK"
              value={formatBytes(info.disk.usedBytes)}
              sub={`/ ${formatBytes(info.disk.totalBytes)}`}
              percent={info.disk.usagePercent}
            />
            <ServerStatCard label="UPTIME" value={formatUptime(info.os.kernelUptimeSeconds)} sub={info.os.distro} />
          </Box>

          <ServerInfoDetails info={info} />
        </>
      )}
    </Stack>
  );
}
