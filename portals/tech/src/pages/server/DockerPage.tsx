import { useCallback, useRef } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import RefreshIcon from '@mui/icons-material/Refresh';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import DockerContainersTable from './DockerContainersTable';
import { DOCKER_CONTAINERS_TABLE, DOCKER_INFO, type DockerContainer, type DockerInfo } from './queries';

export default function DockerPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data, loading, error, refetch } = useQuery<{ techDockerInfo: DockerInfo }>(DOCKER_INFO, {
    fetchPolicy: 'cache-and-network',
  });
  const docker = data?.techDockerInfo;

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data: page } = await client.query({
        query: DOCKER_CONTAINERS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: page.techDockerContainersTable.rows as DockerContainer[],
        total: page.techDockerContainersTable.total as number,
      };
    },
    [client]
  );

  const handleRefresh = () => {
    refetch();
    refetchRef.current?.();
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
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      {error && !docker && <Alert severity="error">Could not load Docker info: {error.message}</Alert>}

      {docker && !docker.available && (
        <Alert severity="warning">
          Docker is not reachable from the API container{docker.error ? `: ${docker.error}` : ''}. Mount the Docker
          socket (<code>/var/run/docker.sock</code>) into the server container to enable this view.
        </Alert>
      )}

      {docker?.available && (
        <>
          <Stack direction="row" spacing={1}>
            <Chip color="success" label={`${docker.containersRunning} running`} />
            <Chip variant="outlined" label={`${docker.containersTotal} total`} />
          </Stack>

          <DockerContainersTable fetchRows={fetchRows} refetchRef={refetchRef} />
        </>
      )}
    </Stack>
  );
}
