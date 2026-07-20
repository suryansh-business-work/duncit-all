import { Dialog, DialogContent, DialogTitle, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { InfoRow } from '@duncit/ui';
import type { OnboardingMeeting } from './queries';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
}

/** Read-only requester details for a meeting row — uses only data already on the row (no extra query). */
export default function RequesterDialog({ meeting, onClose }: Readonly<Props>) {
  if (!meeting) return null;
  const name = meeting.user_name || meeting.contact_name || '—';
  const catPath =
    [meeting.super_category_name, meeting.category_name, meeting.sub_category_name].filter(Boolean).join(' › ') || '—';
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        Requester details
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <InfoRow label="Name" value={name} />
          <InfoRow label="Email" value={meeting.user_email || '—'} />
          <InfoRow label="Phone" value={meeting.contact_phone || '—'} />
          <InfoRow label="Request ID" value={meeting.request_no || '—'} />
          <InfoRow label="Category" value={catPath} />
          <InfoRow label="Requested for" value={fmt(meeting.requested_at)} />
          <InfoRow label="Scheduled" value={fmt(meeting.scheduled_at)} />
          <InfoRow label="Status" value={meeting.status} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
