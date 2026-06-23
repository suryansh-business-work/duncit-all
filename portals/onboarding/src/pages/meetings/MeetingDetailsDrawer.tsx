import { Box, Button, Chip, Divider, Drawer, IconButton, Link, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { MeetingStatus, OnboardingMeeting, SurveyKind } from './queries';

const STATUS_COLOR: Record<MeetingStatus, 'default' | 'info' | 'success' | 'error'> = {
  REQUESTED: 'default',
  SCHEDULED: 'info',
  DONE: 'success',
  CANCELLED: 'error',
};
const KIND_LABEL: Record<SurveyKind, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'Seller' };
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
  onEdit?: (meeting: OnboardingMeeting) => void;
  onCancel?: (meeting: OnboardingMeeting) => void;
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

// Right-side details drawer for a single onboarding meeting. Read-only; the
// schedule page also passes edit/cancel actions, the calendar does not.
export default function MeetingDetailsDrawer({ meeting, onClose, onEdit, onCancel }: Readonly<Props>) {
  const cancellable = !!meeting && (meeting.status === 'REQUESTED' || meeting.status === 'SCHEDULED');
  return (
    <Drawer
      anchor="right"
      open={!!meeting}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 380 } } }}
    >
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
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </IconButton>
          </Stack>

          <Chip
            size="small"
            color={STATUS_COLOR[meeting.status]}
            label={meeting.status}
            sx={{ alignSelf: 'flex-start', fontWeight: 800 }}
          />

          <DetailRow label="Requested for" value={fmt(meeting.requested_at)} />
          <DetailRow label="Scheduled" value={fmt(meeting.scheduled_at)} />
          <DetailRow
            label="Contact"
            value={[meeting.user_email, meeting.contact_phone].filter(Boolean).join(' · ') || '—'}
          />

          {meeting.meeting_link && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Meeting link
              </Typography>
              <Box>
                <Link href={meeting.meeting_link} target="_blank" rel="noopener" variant="body2">
                  Join meeting
                </Link>
              </Box>
            </Box>
          )}
          {meeting.notes && <DetailRow label="Notes" value={meeting.notes} />}
          {meeting.status === 'CANCELLED' && meeting.cancel_reason && (
            <DetailRow label="Cancel reason" value={meeting.cancel_reason} />
          )}

          {(onEdit || onCancel) && (
            <>
              <Divider />
              <Stack direction="row" spacing={1}>
                {onEdit && (
                  <Button variant="contained" onClick={() => onEdit(meeting)}>
                    Schedule
                  </Button>
                )}
                {onCancel && cancellable && (
                  <Button color="error" onClick={() => onCancel(meeting)}>
                    Cancel
                  </Button>
                )}
              </Stack>
            </>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
