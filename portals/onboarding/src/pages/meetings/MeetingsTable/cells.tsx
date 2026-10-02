import { Link, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { meetingStatusLabel } from '../statusLabel';
import type { MeetingApprovalStatus, OnboardingMeeting } from '../queries';
import { formatDateTime } from '@duncit/app-settings';

const STATUS_COLORS: StatusColorMap = {
  REQUESTED: 'default',
  SCHEDULED: 'info',
  DONE: 'success',
  CANCELLED: 'error',
};
export const APPROVAL_LABELS: Record<MeetingApprovalStatus, string> = {
  NONE: '—',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DENIED: 'Denied',
};
const APPROVAL_COLORS: StatusColorMap = {
  NONE: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'error',
};
export const APPROVAL_OPTIONS = (['APPROVED', 'DENIED'] as const).map((s) => ({
  value: s,
  label: APPROVAL_LABELS[s],
}));

export const fmt = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');
export const catPath = (m: OnboardingMeeting) =>
  [m.super_category_name, m.category_name, m.sub_category_name].filter(Boolean).join(' › ') || '—';

/** Onboarding decision on the interviewer's feedback. */
function ApprovalCell({ status }: Readonly<{ status?: MeetingApprovalStatus | null }>) {
  const value = status ?? 'NONE';
  if (value === 'NONE')
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>—
              </Typography>
    );
  return <StatusChip status={value} label={APPROVAL_LABELS[value]} colorMap={APPROVAL_COLORS} />;
}

/** Join link is hidden once a meeting is cancelled or admin-denied. */
function JoinCell({ meeting }: Readonly<{ meeting: OnboardingMeeting }>) {
  const blocked = meeting.status === 'CANCELLED' || meeting.approval_status === 'DENIED';
  if (meeting.meeting_link && !blocked) {
    return (
      <Link href={meeting.meeting_link} target="_blank" rel="noopener" variant="body2">
        Join
      </Link>
    );
  }
  return (
    <Typography variant="body2" sx={{
      color: "text.secondary"
    }}>—
          </Typography>
  );
}

export const getMeetingRowId = (m: OnboardingMeeting) => m.id;

export const renderRequestNo = (m: OnboardingMeeting) => (
  <Typography
    variant="body2"
    sx={{
      fontWeight: 800,
      fontFamily: 'monospace',
      whiteSpace: 'nowrap'
    }}>
    {m.request_no || '—'}
  </Typography>
);

export const requesterValue = (m: OnboardingMeeting) => m.user_name || m.contact_name || '—';

export const renderJoin = (m: OnboardingMeeting) => <JoinCell meeting={m} />;

export const renderMeetingStatus = (m: OnboardingMeeting) => (
  <>
    <StatusChip status={m.status} colorMap={STATUS_COLORS} label={meetingStatusLabel(m)} />
    {m.status === 'CANCELLED' && m.cancel_reason && (
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
        {m.cancel_reason}
      </Typography>
    )}
  </>
);

export const renderApproval = (m: OnboardingMeeting) => <ApprovalCell status={m.approval_status} />;
