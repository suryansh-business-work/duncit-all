import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatDateTime } from './format';
import { DOCKER_INFO, type DockerInfo } from './queries';

export default function DockerPage() {
  const { data, loading, error, refetch } = useQuery<{ techDockerInfo: DockerInfo }>(DOCKER_INFO, {
    fetchPolicy: 'cache-and-network',
  });
  const docker = data?.techDockerInfo;

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
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      {error && !docker && <Alert severity="error">Could not load Docker info: {error.message}</Alert>}

      {!docker && loading && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}

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

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Image</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {docker.containers.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{c.name || c.id}</TableCell>
                    <TableCell sx={{ wordBreak: 'break-all' }}>{c.image}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={c.state === 'running' ? 'success' : 'default'}
                        label={c.state}
                      />
                    </TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell>{formatDateTime(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {docker.containers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No containers found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Stack>
  );
}
