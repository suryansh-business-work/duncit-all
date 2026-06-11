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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { ONBOARDING_MEETINGS, UPDATE_MEETING, type MeetingStatus, type OnboardingMeeting, type SurveyKind } from './queries';

const STATUS_COLORS: Record<MeetingStatus, 'default' | 'info' | 'success' | 'error'> = {
  REQUESTED: 'default', SCHEDULED: 'info', DONE: 'success', CANCELLED: 'error',
};
const STATUSES: MeetingStatus[] = ['REQUESTED', 'SCHEDULED', 'DONE', 'CANCELLED'];
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Onboarding → Meeting → Venue/Host Meeting Schedule: table of requests + scheduling. */
export default function MeetingSchedulePage() {
  const params = useParams<{ kind: string }>();
  const kind = (params.kind?.toUpperCase() as SurveyKind) || 'VENUE';
  const valid = kind === 'VENUE' || kind === 'HOST';

  const { data, loading, refetch } = useQuery<{ onboardingMeetings: OnboardingMeeting[] }>(ONBOARDING_MEETINGS, { variables: { filter: { kind } }, skip: !valid, fetchPolicy: 'cache-and-network' });
  const [updateMeeting, { loading: saving }] = useMutation(UPDATE_MEETING);
  const [editing, setEditing] = useState<OnboardingMeeting | null>(null);
  const [when, setWhen] = useState('');
  const [link, setLink] = useState('');
  const [status, setStatus] = useState<MeetingStatus>('SCHEDULED');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!valid) return <Alert severity="error">Unknown meeting kind.</Alert>;
  const meetings = data?.onboardingMeetings ?? [];

  const openEdit = (m: OnboardingMeeting) => {
    setEditing(m); setWhen(toLocalInput(m.scheduled_at)); setLink(m.meeting_link ?? ''); setStatus(m.status === 'REQUESTED' ? 'SCHEDULED' : m.status); setNotes(m.notes ?? ''); setError(null);
  };
  const save = async () => {
    if (!editing) return;
    setError(null);
    try {
      await updateMeeting({ variables: { id: editing.id, input: { status, scheduled_at: when ? new Date(when).toISOString() : null, meeting_link: link.trim() || null, notes } } });
      setEditing(null);
      await refetch();
    } catch (e: any) {
      setError(e?.message ?? 'Could not update meeting');
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <EventIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>{kind === 'VENUE' ? 'Venue' : 'Host'} Meeting Schedule</Typography>
          <Typography variant="body2" color="text.secondary">Onboarding meeting requests from {kind === 'VENUE' ? 'venue' : 'host'} applicants.</Typography>
        </Box>
      </Stack>

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
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {meetings.map((m) => (
                <TableRow key={m.id} hover>
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
                  <TableCell><Chip size="small" color={STATUS_COLORS[m.status]} label={m.status} /></TableCell>
                  <TableCell align="right"><Button size="small" onClick={() => openEdit(m)}>Schedule</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>Schedule meeting</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="caption" color="text.secondary">Requested for {fmt(editing?.requested_at)}{editing?.notes ? ` · ${editing.notes}` : ''}</Typography>
            <TextField size="small" type="datetime-local" label="Scheduled date & time" value={when} onChange={(e) => setWhen(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField size="small" type="url" label="Meeting link" placeholder="https://meet.google.com/…" value={link} onChange={(e) => setLink(e.target.value)} fullWidth />
            <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value as MeetingStatus)} fullWidth>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
