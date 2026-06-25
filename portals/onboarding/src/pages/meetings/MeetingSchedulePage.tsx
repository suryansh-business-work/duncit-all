import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import CancelMeetingDialog from './CancelMeetingDialog';
import MeetingDetailsDrawer from './MeetingDetailsDrawer';
import MeetingRowActions from './MeetingRowActions';
import ScheduleMeetingDialog from './ScheduleMeetingDialog';
import SendFeedbackDialog from './SendFeedbackDialog';
import {
  ONBOARDING_MEETINGS,
  UPDATE_MEETING,
  type MeetingApprovalStatus,
  type MeetingStatus,
  type OnboardingMeeting,
  type SurveyKind,
} from './queries';

const STATUS_COLORS: Record<MeetingStatus, 'default' | 'info' | 'success' | 'error'> = {
  REQUESTED: 'default', SCHEDULED: 'info', DONE: 'success', CANCELLED: 'error',
};
const APPROVAL_LABELS: Record<MeetingApprovalStatus, string> = {
  NONE: '—', PENDING: 'Pending', APPROVED: 'Approved', DENIED: 'Denied',
};
const APPROVAL_COLORS: Record<MeetingApprovalStatus, 'default' | 'warning' | 'success' | 'error'> = {
  NONE: 'default', PENDING: 'warning', APPROVED: 'success', DENIED: 'error',
};
const STATUS_FILTERS: { value: MeetingStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const KIND_LABELS: Record<SurveyKind, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'Seller' };
const catPath = (m: OnboardingMeeting) =>
  [m.super_category_name, m.category_name, m.sub_category_name].filter(Boolean).join(' › ') || '—';

/** Admin-approval state of the interviewer's feedback. */
function ApprovalCell({ status }: Readonly<{ status?: MeetingApprovalStatus | null }>) {
  const value = status ?? 'NONE';
  if (value === 'NONE') return <Typography variant="body2" color="text.secondary">—</Typography>;
  return <Chip size="small" color={APPROVAL_COLORS[value]} label={APPROVAL_LABELS[value]} />;
}

/** Join link is hidden once a meeting is cancelled or admin-denied. */
function JoinCell({ meeting }: Readonly<{ meeting: OnboardingMeeting }>) {
  const blocked = meeting.status === 'CANCELLED' || meeting.approval_status === 'DENIED';
  if (meeting.meeting_link && !blocked) {
    return <Link href={meeting.meeting_link} target="_blank" rel="noopener" variant="body2">Join</Link>;
  }
  return <Typography variant="body2" color="text.secondary">—</Typography>;
}

/** Onboarding → Meeting → Venue/Host/Seller Meeting Schedule: requests + scheduling. */
export default function MeetingSchedulePage() {
  const params = useParams<{ kind: string }>();
  const kind = (params.kind?.toUpperCase() as SurveyKind) || 'VENUE';
  const valid = kind === 'VENUE' || kind === 'HOST' || kind === 'ECOMM';
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | ''>('');

  const filter = { kind, ...(statusFilter ? { status: statusFilter } : {}) };
  const { data, loading, refetch } = useQuery<{ onboardingMeetings: OnboardingMeeting[] }>(ONBOARDING_MEETINGS, { variables: { filter }, skip: !valid, fetchPolicy: 'cache-and-network' });
  const [updateMeeting, { loading: marking }] = useMutation(UPDATE_MEETING);
  const [editing, setEditing] = useState<OnboardingMeeting | null>(null);
  const [cancelling, setCancelling] = useState<OnboardingMeeting | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<OnboardingMeeting | null>(null);
  const [selected, setSelected] = useState<OnboardingMeeting | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!valid) return <Alert severity="error">Unknown meeting kind.</Alert>;
  const meetings = data?.onboardingMeetings ?? [];

  const markDone = async (m: OnboardingMeeting) => {
    setActionError(null);
    try {
      await updateMeeting({ variables: { id: m.id, input: { status: 'DONE' } } });
      await refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not mark the meeting as done');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <EventIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>{KIND_LABELS[kind]} Meeting Schedule</Typography>
          <Typography variant="body2" color="text.secondary">Onboarding meeting requests from {KIND_LABELS[kind].toLowerCase()} applicants.</Typography>
        </Box>
      </Stack>

      <ToggleButtonGroup size="small" exclusive value={statusFilter} onChange={(_, v) => setStatusFilter(v ?? '')}>
        {STATUS_FILTERS.map((f) => <ToggleButton key={f.label} value={f.value}>{f.label}</ToggleButton>)}
      </ToggleButtonGroup>

      {actionError && <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert>}

      <Card>
        {loading && meetings.length === 0 && (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress /></Stack>
        )}
        {!loading && meetings.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>No meetings for this filter.</Typography>
        )}
        {meetings.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Requester</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Requested for</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Link</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Admin approval</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {meetings.map((m) => (
                <TableRow key={m.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(m)}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{m.user_name || m.contact_name || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.user_email || m.contact_phone || ''}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{catPath(m)}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{fmt(m.requested_at)}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{fmt(m.scheduled_at)}</Typography></TableCell>
                  <TableCell><JoinCell meeting={m} /></TableCell>
                  <TableCell>
                    <Chip size="small" color={STATUS_COLORS[m.status]} label={m.status} />
                    {m.status === 'CANCELLED' && m.cancel_reason && (
                      <Typography variant="caption" color="text.secondary" display="block">{m.cancel_reason}</Typography>
                    )}
                  </TableCell>
                  <TableCell><ApprovalCell status={m.approval_status} /></TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <MeetingRowActions
                      meeting={m}
                      marking={marking}
                      onSchedule={setEditing}
                      onMarkDone={markDone}
                      onSendFeedback={setFeedbackFor}
                      onReject={setCancelling}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ScheduleMeetingDialog meeting={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); return refetch(); }} />
      <CancelMeetingDialog meeting={cancelling} onClose={() => setCancelling(null)} onCancelled={() => refetch()} />
      <SendFeedbackDialog meeting={feedbackFor} onClose={() => setFeedbackFor(null)} onSent={() => refetch()} />
      <MeetingDetailsDrawer
        meeting={selected}
        onClose={() => setSelected(null)}
        onEdit={(meeting) => { setSelected(null); setEditing(meeting); }}
        onCancel={(meeting) => { setSelected(null); setCancelling(meeting); }}
      />
    </Stack>
  );
}
