import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { InfoRow } from '@duncit/ui';
import type { HostRequest } from './queries';

interface Props {
  request: HostRequest | null;
  onClose: () => void;
  onApprove: (r: HostRequest) => void;
  onReject: (r: HostRequest) => void;
}

/** Opens automatically after a request is acknowledged — shows the host's contact
 *  snapshot and lets staff decide right away (Approve / Reject). */
export default function ContactDetailsDialog({ request, onClose, onApprove, onReject }: Readonly<Props>) {
  return (
    <Dialog open={!!request} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6 }}>
        Contact Details
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <InfoRow variant="inline" labelWidth={110} label="Host Name" value={request?.host_name || '—'} />
          <InfoRow variant="inline" labelWidth={110} label="Email" value={request?.host_email || '—'} />
          <InfoRow variant="inline" labelWidth={110} label="Phone Number" value={request?.host_phone || '—'} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="error" variant="outlined" onClick={() => request && onReject(request)}>Reject</Button>
        <Button variant="contained" color="success" onClick={() => request && onApprove(request)}>Approve</Button>
      </DialogActions>
    </Dialog>
  );
}
