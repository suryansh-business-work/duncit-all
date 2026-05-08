import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useDateFormat } from '../../utils/dateFormat';
import { DELETE_INTERVIEW, INTERVIEWS, UPDATE_INTERVIEW } from './queries';
import { STATUS_COLORS, STATUS_KEYS, slotTime } from './helpers';
import InterviewsTable from './InterviewsTable';
import ManageInterviewDialog from './ManageInterviewDialog';

export default function InterviewRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<any | null>(null);
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const { formatDate, formatDateTime } = useDateFormat();
  const fmtSlot = (s: { start: string; end: string }) =>
    `${formatDate(s.start)} ${slotTime(s.start)}`;
  const fmtSlotLong = (s: { start: string; end: string }) =>
    `${formatDateTime(s.start)} – ${slotTime(s.end)}`;

  const filter = useMemo(() => {
    const f: any = {};
    if (statusFilter) f.status = statusFilter;
    if (typeFilter) f.type = typeFilter;
    return Object.keys(f).length ? f : undefined;
  }, [statusFilter, typeFilter]);

  const { data, loading, refetch } = useQuery(INTERVIEWS, { variables: { filter } });
  const [updateMut, { loading: saving }] = useMutation(UPDATE_INTERVIEW);
  const [deleteMut] = useMutation(DELETE_INTERVIEW);

  const items = data?.interviews ?? [];

  const counts = useMemo(() => {
    const map: Record<string, number> = {
      PENDING: 0,
      SCHEDULED: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    items.forEach((i: any) => {
      map[i.status] = (map[i.status] || 0) + 1;
    });
    return map;
  }, [items]);

  const [pickedSlotIdx, setPickedSlotIdx] = useState<number>(-1);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('SCHEDULED');

  const openDetails = (it: any) => {
    setActive(it);
    setNewStatus(it.status === 'PENDING' ? 'SCHEDULED' : it.status);
    setMeetingLink(it.meeting_link || '');
    setNotes(it.admin_notes || '');
    setPickedSlotIdx(-1);
    if (it.scheduled_slot) {
      setCustomStart(it.scheduled_slot.start);
      setCustomEnd(it.scheduled_slot.end);
    } else if (it.preferred_slots[0]) {
      setCustomStart(it.preferred_slots[0].start);
      setCustomEnd(it.preferred_slots[0].end);
      setPickedSlotIdx(0);
    } else {
      setCustomStart('');
      setCustomEnd('');
    }
  };

  const submit = async () => {
    if (!active) return;
    setError(null);
    try {
      const input: any = {
        status: newStatus,
        meeting_link: meetingLink || null,
        admin_notes: notes || null,
      };
      if (newStatus === 'SCHEDULED' || newStatus === 'APPROVED') {
        if (!customStart || !customEnd) {
          setError('Pick a scheduled time');
          return;
        }
        input.scheduled_slot = {
          start: new Date(customStart).toISOString(),
          end: new Date(customEnd).toISOString(),
        };
      }
      await updateMut({ variables: { interview_doc_id: active.id, input } });
      setToast('Interview updated');
      setActive(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteMut({ variables: { interview_doc_id: delTarget.id } });
      setToast('Deleted');
      setDelTarget(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <EventAvailableIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Interview Requests
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {STATUS_KEYS.map((s) => (
          <Chip
            key={s}
            label={`${s} · ${counts[s] || 0}`}
            color={statusFilter === s ? STATUS_COLORS[s] : 'default'}
            variant={statusFilter === s ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
          />
        ))}
        <Box sx={{ flex: 1 }} />
        <TextField
          select
          size="small"
          label="Type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="HOST">Host</MenuItem>
          <MenuItem value="VENUE">Venue</MenuItem>
        </TextField>
      </Stack>

      <InterviewsTable
        loading={loading}
        items={items}
        fmtSlot={fmtSlot}
        onManage={openDetails}
        onDelete={setDelTarget}
      />

      <ManageInterviewDialog
        active={active}
        saving={saving}
        error={error}
        newStatus={newStatus}
        setNewStatus={setNewStatus}
        pickedSlotIdx={pickedSlotIdx}
        setPickedSlotIdx={setPickedSlotIdx}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        meetingLink={meetingLink}
        setMeetingLink={setMeetingLink}
        notes={notes}
        setNotes={setNotes}
        fmtSlotLong={fmtSlotLong}
        onClose={() => setActive(null)}
        onSubmit={submit}
      />

      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)}>
        <DialogTitle>Delete this request?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast || ''}
      />
    </Box>
  );
}
