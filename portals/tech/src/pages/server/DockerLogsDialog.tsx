import { useQuery } from '@apollo/client/react';
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import LogPane from './LogPane';
import { TECH_CONTAINER_LOGS } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  /** Container name whose logs to stream; null closes the dialog. */
  name: string | null;
  onClose: () => void;
}

/** Terminal-style live log view for one container. Polls the container's recent
 * logs every 1.5s while open — used to watch a container come back up after a
 * restart. */
export default function DockerLogsDialog({ name, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
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
        <LogPane text={logs} label={`Logs · ${name}`} />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
