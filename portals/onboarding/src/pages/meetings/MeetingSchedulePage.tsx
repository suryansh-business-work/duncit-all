import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
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
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import CancelMeetingDialog from './CancelMeetingDialog';
import MeetingDetailsDrawer from './MeetingDetailsDrawer';
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
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const KIND_LABELS: Record<SurveyKind, string> = { VENUE: 'Venue', HOST: 'Host', ECOMM: 'Seller' };

/** Admin-approval state of the interviewer's feedback. */
function ApprovalCell({ status }: Readonly<{ status?: MeetingApprovalStatus | null }>) {
  const value = status ?? 'NONE';
  if (value === 'NONE') return <Typography variant="body2" color="text.secondary">—</Typography>;
  return <Chip size="small" color={APPROVAL_COLORS[value]} label={APPROVAL_LABELS[value]} />;
}

interface RowActionsProps {
  meeting: OnboardingMeeting;
  marking: boolean;
  onSchedule: (m: OnboardingMeeting) => void;
  onMarkDone: (m: OnboardingMeeting) => void;
  onSendFeedback: (m: OnboardingMeeting) => void;
  onCancel: (m: OnboardingMeeting) => void;
}

/** Row actions, gated by meeting + approval state. */
function RowActions({ meeting, marking, onSchedule, onMarkDone, onSendFeedback, onCancel }: Readonly<RowActionsProps>) {
  const approval = meeting.approval_status ?? 'NONE';
  const canCancel = meeting.status === 'REQUESTED' || meeting.status === 'SCHEDULED';
  const canSendFeedback = meeting.status === 'DONE' && (approval === 'NONE' || approval === 'DENIED');
  return (
    <>
      <Button size="small" onClick={() => onSchedule(meeting)}>Schedule</Button>
      {meeting.status === 'SCHEDULED' && (
        <Button size="small" color="success" disabled={marking} onClick={() => onMarkDone(meeting)}>Mark done</Button>
      )}
      {canSendFeedback && (
        <Button size="small" onClick={() => onSendFeedback(meeting)}>Send feedback</Button>
      )}
      {canCancel && (
        <Button size="small" color="error" onClick={() => onCancel(meeting)}>Cancel</Button>
      )}
    </>
  );
}

/** Onboarding → Meeting → Venue/Host/Seller Meeting Schedule: requests + scheduling. */
export default function MeetingSchedulePage() {
  const params = useParams<{ kind: string }>();
  const kind = (params.kind?.toUpperCase() as SurveyKind) || 'VENUE';
  const valid = kind === 'VENUE' || kind === 'HOST' || kind === 'ECOMM';

  const { data, loading, refetch } = useQuery<{ onboardingMeetings: OnboardingMeeting[] }>(ONBOARDING_MEETINGS, { variables: { filter: { kind } }, skip: !valid, fetchPolicy: 'cache-and-network' });
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

      {actionError && <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert>}

      <Card>
        {loading && meetings.length === 0 && (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress /></Stack>
        )}
        {!loading && meetings.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>No meeting requests yet.</Typography>
        )}
        {meetings.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Requester</TableCell>
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
                  <TableCell><Typography variant="body2">{fmt(m.requested_at)}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{fmt(m.scheduled_at)}</Typography></TableCell>
                  <TableCell>
                    {m.meeting_link
                      ? <Link href={m.meeting_link} target="_blank" rel="noopener" variant="body2">Join</Link>
                      : <Typography variant="body2" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={STATUS_COLORS[m.status]} label={m.status} />
                    {m.status === 'CANCELLED' && m.cancel_reason && (
                      <Typography variant="caption" color="text.secondary" display="block">{m.cancel_reason}</Typography>
                    )}
                  </TableCell>
                  <TableCell><ApprovalCell status={m.approval_status} /></TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      meeting={m}
                      marking={marking}
                      onSchedule={setEditing}
                      onMarkDone={markDone}
                      onSendFeedback={setFeedbackFor}
                      onCancel={setCancelling}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ScheduleMeetingDialog
        meeting={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); return refetch(); }}
      />

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
