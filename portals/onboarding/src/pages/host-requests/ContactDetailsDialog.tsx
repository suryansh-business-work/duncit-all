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
import { useTranslation } from '@duncit/app-settings';

interface Props {
  request: HostRequest | null;
  onClose: () => void;
  onApprove: (r: HostRequest) => void;
  onReject: (r: HostRequest) => void;
}

/** Opens automatically after a request is acknowledged — shows the host's contact
 *  snapshot and lets staff decide right away (Approve / Reject). */
export default function ContactDetailsDialog({ request, onClose, onApprove, onReject }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!request} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6 }}>
        Contact Details
        <IconButton aria-label={t('shell.common.close')} onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <InfoRow variant="inline" labelWidth={110} label={t('onboarding.hostRequests.hostName')} value={request?.host_name || '—'} />
          <InfoRow variant="inline" labelWidth={110} label={t('shell.common.email')} value={request?.host_email || '—'} />
          <InfoRow variant="inline" labelWidth={110} label={t('onboarding.hostRequests.phoneNumber')} value={request?.host_phone || '—'} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="error" variant="outlined" onClick={() => request && onReject(request)}>{t('onboarding.common.reject')}</Button>
        <Button variant="contained" color="success" onClick={() => request && onApprove(request)}>{t('onboarding.hostRequests.approve')}</Button>
      </DialogActions>
    </Dialog>
  );
}
