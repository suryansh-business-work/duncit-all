import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StatusDot, { type DotState } from '../StatusDot';
import { SectionTitle } from './DetailRow';
import ProbeSection from './ProbeSection';
import HealthSection from './HealthSection';
import HistoryCharts from './HistoryCharts';
import { useServiceDetails } from './useServiceDetails';
import type { StatusService } from '../../types';

interface DialogProps {
  service: StatusService | null;
  onClose: () => void;
}

export default function ServiceDetailsDialog({ service, onClose }: Readonly<DialogProps>) {
  const details = useServiceDetails(service);

  let dotState: DotState = 'info';
  if (details.probe) dotState = details.probe.ok ? 'success' : 'error';
  if (details.probeError) dotState = 'error';

  return (
    <Dialog open={service !== null} onClose={onClose} fullWidth maxWidth="sm">
      {service && (
        <>
          <DialogTitle component="div">
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1.25} alignItems="center">
                <StatusDot state={dotState} size={12} />
                <Typography variant="h6" component="h2">
                  {service.name}
                </Typography>
              </Stack>
              <IconButton onClick={onClose} aria-label="Close details" size="small">
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            <SectionTitle>Endpoint</SectionTitle>
            <ProbeSection probe={details.probe} error={details.probeError} />
            {service.health && (
              <>
                <SectionTitle>Server health</SectionTitle>
                <HealthSection health={details.health} failed={details.healthError} />
              </>
            )}
            <SectionTitle>History</SectionTitle>
            <HistoryCharts history={details.history} failed={details.historyError} />
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
