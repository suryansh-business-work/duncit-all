import { Box, Button, Divider, Drawer, IconButton, Link, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { InfoRow, StatusChip, type StatusColorMap } from '@duncit/ui';
import { SurveyAnswers } from '../../components/survey-answers';
import { meetingStatusLabel } from './statusLabel';
import type { OnboardingMeeting, SurveyKind } from './queries';
import { formatDateTime } from '@duncit/app-settings';

const STATUS_COLOR: StatusColorMap = {
  REQUESTED: 'default',
  SCHEDULED: 'info',
  DONE: 'success',
  CANCELLED: 'error',
};
const KIND_LABEL: Record<SurveyKind, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'E-Commerce Brand', CLUB_ADMIN: 'Club Admin' };
const fmt = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
  onEdit?: (meeting: OnboardingMeeting) => void;
  onCancel?: (meeting: OnboardingMeeting) => void;
}

// Right-side details drawer for a single onboarding meeting (incl. survey answers).
export default function MeetingDetailsDrawer({ meeting, onClose, onEdit, onCancel }: Readonly<Props>) {
  // A meeting is open to scheduling only while it is still pending: once it is DONE it
  // has already happened, and CANCELLED/DENIED rows are settled the other way.
  const pending = !!meeting && (meeting.status === 'REQUESTED' || meeting.status === 'SCHEDULED');
  const blocked = !!meeting && (meeting.status === 'CANCELLED' || meeting.approval_status === 'DENIED');
  const showEdit = !!onEdit && pending && !blocked;
  const showCancel = !!onCancel && pending && !blocked;
  // Matches the row Actions menu — a meeting that already has a slot is re-scheduled.
  const editLabel = meeting?.status === 'SCHEDULED' ? 'Reschedule' : 'Schedule';
  const catPath = meeting
    ? [meeting.super_category_name, meeting.category_name, meeting.sub_category_name].filter(Boolean).join(' › ')
    : '';
  return (
    <Drawer anchor="right" open={!!meeting} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 380 } } }}>
      {meeting && (
        <Stack spacing={2} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary" fontWeight={800}>
                {KIND_LABEL[meeting.kind] ?? meeting.kind} meeting
              </Typography>
              <Typography variant="h6" fontWeight={900}>
                {meeting.user_name || meeting.contact_name || 'Applicant'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close"><CloseIcon /></IconButton>
          </Stack>

          <StatusChip status={meeting.status} colorMap={STATUS_COLOR} label={meetingStatusLabel(meeting)} sx={{ alignSelf: 'flex-start', fontWeight: 800 }} />

          {catPath && <InfoRow label="Category" value={catPath} />}
          <InfoRow label="Requested for" value={fmt(meeting.requested_at)} />
          <InfoRow label="Scheduled" value={fmt(meeting.scheduled_at)} />
          <InfoRow label="Contact" value={[meeting.user_email, meeting.contact_phone].filter(Boolean).join(' · ') || '—'} />

          {meeting.meeting_link && !blocked && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>Meeting link</Typography>
              <Box>
                <Link href={meeting.meeting_link} target="_blank" rel="noopener" variant="body2">Join meeting</Link>
              </Box>
            </Box>
          )}
          {meeting.notes && <InfoRow label="Notes" value={meeting.notes} />}
          {meeting.status === 'CANCELLED' && meeting.cancel_reason && <InfoRow label="Cancel reason" value={meeting.cancel_reason} />}

          <Divider />
          {meeting.user_id && <SurveyAnswers userId={meeting.user_id} kind={meeting.kind} />}

          {(showEdit || showCancel) && (
            <>
              <Divider />
              <Stack direction="row" spacing={1}>
                {showEdit && <Button variant="contained" onClick={() => onEdit?.(meeting)}>{editLabel}</Button>}
                {showCancel && <Button color="error" onClick={() => onCancel?.(meeting)}>Cancel</Button>}
              </Stack>
            </>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
