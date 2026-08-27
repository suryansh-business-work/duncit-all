import { Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { InfoRow } from '@duncit/ui';
import { meetingStatusLabel } from './statusLabel';
import type { OnboardingMeeting } from './queries';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

const fmt = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
}

/** Read-only requester details for a meeting row — uses only data already on the row (no extra query). */
export default function RequesterDialog({ meeting, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!meeting) return null;
  const name = meeting.user_name || meeting.contact_name || '—';
  const catPath =
    [meeting.super_category_name, meeting.category_name, meeting.sub_category_name].filter(Boolean).join(' › ') || '—';
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        Requester details
        <DuncitIconButton onClick={onClose} aria-label={t('shell.common.close')} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <InfoRow label={t('shell.common.name')} value={name} />
          <InfoRow label={t('shell.common.email')} value={meeting.user_email || '—'} />
          <InfoRow label={t('shell.common.phone')} value={meeting.contact_phone || '—'} />
          <InfoRow label={t('onboarding.common.requestId')} value={meeting.request_no || '—'} />
          <InfoRow label={t('onboarding.common.category')} value={catPath} />
          <InfoRow label={t('onboarding.meetings.requestedFor')} value={fmt(meeting.requested_at)} />
          <InfoRow label={t('onboarding.meetings.scheduled')} value={fmt(meeting.scheduled_at)} />
          <InfoRow label={t('shell.common.status')} value={meetingStatusLabel(meeting)} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
