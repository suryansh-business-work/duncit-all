import { useQuery } from '@apollo/client';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { TECH_CONTAINER_LOGS } from './queries';

interface Props {
  /** Container name whose logs to stream; null closes the dialog. */
  name: string | null;
  onClose: () => void;
}

/** Terminal-style live log view for one container. Polls the container's recent
 * logs every 1.5s while open — used to watch a container come back up after a
 * restart. */
export default function DockerLogsDialog({ name, onClose }: Readonly<Props>) {
  const { data } = useQuery<{ techContainerLogs: string }>(TECH_CONTAINER_LOGS, {
    variables: { name, tail: 300 },
    skip: !name,
    pollInterval: 1500,
    fetchPolicy: 'network-only',
  });
  const logs = data?.techContainerLogs ?? 'Loading logs…';

  return (
    <Dialog open={!!name} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Logs · {name}</DialogTitle>
      <DialogContent>
        <Box
          component="pre"
          sx={{
            bgcolor: '#0b0e14',
            color: '#c9d1d9',
            p: 2,
            m: 0,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.5,
            maxHeight: 440,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {logs}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
