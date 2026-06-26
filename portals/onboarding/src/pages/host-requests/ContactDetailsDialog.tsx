import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { HostRequest } from './queries';

interface Props {
  request: HostRequest | null;
  onClose: () => void;
  onApprove: (r: HostRequest) => void;
  onReject: (r: HostRequest) => void;
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="baseline">
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>{value}</Typography>
    </Stack>
  );
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
          <InfoRow label="Host Name" value={request?.host_name || '—'} />
          <InfoRow label="Email" value={request?.host_email || '—'} />
          <InfoRow label="Phone Number" value={request?.host_phone || '—'} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="error" variant="outlined" onClick={() => request && onReject(request)}>Reject</Button>
        <Button variant="contained" color="success" onClick={() => request && onApprove(request)}>Approve</Button>
      </DialogActions>
    </Dialog>
  );
}
