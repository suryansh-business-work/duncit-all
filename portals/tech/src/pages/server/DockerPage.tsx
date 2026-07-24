import { useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useApolloTableFetch } from '@duncit/table';
import DockerContainersTable from './DockerContainersTable';
import DockerLogsDialog from './DockerLogsDialog';
import {
  DOCKER_CONTAINERS_TABLE,
  DOCKER_INFO,
  TECH_RESTART_CONTAINER,
  type DockerContainer,
  type DockerInfo,
  type TechRestartResult,
} from './queries';

export default function DockerPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data, loading, error, refetch } = useQuery<{ techDockerInfo: DockerInfo }>(DOCKER_INFO, {
    fetchPolicy: 'cache-and-network',
  });
  const docker = data?.techDockerInfo;

  const fetchRows = useApolloTableFetch<DockerContainer>(
    client,
    DOCKER_CONTAINERS_TABLE,
    'techDockerContainersTable',
  );

  const [restartName, setRestartName] = useState<string | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [restart] = useMutation<{ techRestartContainer: TechRestartResult }>(
    TECH_RESTART_CONTAINER,
  );

  const handleRefresh = () => {
    refetch();
    refetchRef.current?.();
  };

  const handleRestart = async (name: string) => {
    setRestartError(null);
    // Open the log dialog immediately so the container is watched as it restarts.
    setRestartName(name);
    try {
      const res = await restart({ variables: { name } });
      const result = res.data?.techRestartContainer;
      if (!result?.ok) setRestartError(result?.error || `Could not restart ${name}`);
      handleRefresh();
    } catch (e) {
      setRestartError(e instanceof Error ? e.message : `Could not restart ${name}`);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <ViewInArIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>
            Server · Docker
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Containers running on the host{docker?.version ? ` · Docker ${docker.version}` : ''}.
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {error && !docker && (
        <Alert severity="error">Could not load Docker info: {error.message}</Alert>
      )}

      {restartError && (
        <Alert severity="error" onClose={() => setRestartError(null)}>
          {restartError}
        </Alert>
      )}

      {docker && !docker.available && (
        <Alert severity="warning">
          Docker is not reachable from the API container{docker.error ? `: ${docker.error}` : ''}.
          Mount the Docker socket (<code>/var/run/docker.sock</code>) into the server container to
          enable this view.
        </Alert>
      )}

      {docker?.available && (
        <>
          <Stack direction="row" spacing={1}>
            <Chip color="success" label={`${docker.containersRunning} running`} />
            <Chip variant="outlined" label={`${docker.containersTotal} total`} />
          </Stack>

          <DockerContainersTable
            fetchRows={fetchRows}
            refetchRef={refetchRef}
            onRestart={handleRestart}
          />
        </>
      )}

      <DockerLogsDialog name={restartName} onClose={() => setRestartName(null)} />
    </Stack>
  );
}
