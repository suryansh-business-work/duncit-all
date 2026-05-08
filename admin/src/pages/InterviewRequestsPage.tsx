import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DateTimeField from '../components/DateTimeField';

const INTERVIEWS = gql`
  query Interviews($filter: InterviewFilterInput) {
    interviews(filter: $filter) {
      id
      type
      applicant_name
      applicant_email
      applicant_phone
      about
      business_name
      business_address
      city
      zone
      preferred_slots {
        start
        end
      }
      scheduled_slot {
        start
        end
      }
      status
      meeting_link
      admin_notes
      created_at
    }
  }
`;

const UPDATE_INTERVIEW = gql`
  mutation UpdateInterview($interview_doc_id: ID!, $input: UpdateInterviewInput!) {
    updateInterview(interview_doc_id: $interview_doc_id, input: $input) {
      id
      status
    }
  }
`;

const DELETE_INTERVIEW = gql`
  mutation DeleteInterview($interview_doc_id: ID!) {
    deleteInterview(interview_doc_id: $interview_doc_id)
  }
`;

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  PENDING: 'warning',
  SCHEDULED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
};

const fmtSlot = (s: { start: string; end: string }) => {
  const d = new Date(s.start);
  return `${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

const fmtSlotLong = (s: { start: string; end: string }) => {
  const a = new Date(s.start);
  const b = new Date(s.end);
  return `${a.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} · ${a.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${b.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

export default function InterviewRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<any | null>(null);
  const [delTarget, setDelTarget] = useState<any | null>(null);

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
    const map: Record<string, number> = { PENDING: 0, SCHEDULED: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
    items.forEach((i: any) => { map[i.status] = (map[i.status] || 0) + 1; });
    return map;
  }, [items]);

  // Active row local state
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
      const input: any = { status: newStatus, meeting_link: meetingLink || null, admin_notes: notes || null };
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
        {(['PENDING', 'SCHEDULED', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map((s) => (
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

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : items.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              No interview requests yet.
            </Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Applicant</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Preferred Slots</TableCell>
                    <TableCell>Scheduled</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it: any) => (
                    <TableRow key={it.id} hover>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={it.type === 'HOST' ? <StorefrontIcon /> : <AddBusinessIcon />}
                          label={it.type}
                          color={it.type === 'HOST' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {it.applicant_name}
                        </Typography>
                        {it.business_name && (
                          <Typography variant="caption" color="text.secondary">
                            {it.business_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">{it.applicant_email}</Typography>
                        <Typography variant="caption" color="text.secondary">{it.applicant_phone}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, maxWidth: 280 }}>
                          {it.preferred_slots.slice(0, 3).map((s: any, i: number) => (
                            <Chip key={i} size="small" label={fmtSlot(s)} variant="outlined" />
                          ))}
                          {it.preferred_slots.length > 3 && (
                            <Chip size="small" label={`+${it.preferred_slots.length - 3}`} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {it.scheduled_slot ? (
                          <Chip size="small" color="info" label={fmtSlot(it.scheduled_slot)} />
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={STATUS_COLORS[it.status]} label={it.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Manage">
                          <IconButton size="small" onClick={() => openDetails(it)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDelTarget(it)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Manage dialog */}
      <Dialog open={!!active} onClose={() => setActive(null)} fullWidth maxWidth="sm">
        <DialogTitle>Manage Interview Request</DialogTitle>
        <DialogContent>
          {active && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2">{active.applicant_name} · {active.type}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {active.applicant_email} · {active.applicant_phone}
                </Typography>
              </Box>
              {active.business_name && (
                <Typography variant="body2">
                  <strong>Business:</strong> {active.business_name}
                  {active.business_address ? ` — ${active.business_address}` : ''}
                </Typography>
              )}
              {(active.city || active.zone) && (
                <Typography variant="body2">
                  <strong>Location:</strong> {[active.city, active.zone].filter(Boolean).join(' / ')}
                </Typography>
              )}
              <Box>
                <Typography variant="subtitle2" gutterBottom>About</Typography>
                <Typography variant="body2" color="text.secondary">{active.about}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>Preferred slots</Typography>
                <Stack spacing={0.5}>
                  {active.preferred_slots.map((s: any, i: number) => (
                    <Chip
                      key={i}
                      label={fmtSlotLong(s)}
                      variant={pickedSlotIdx === i ? 'filled' : 'outlined'}
                      color={pickedSlotIdx === i ? 'primary' : 'default'}
                      onClick={() => {
                        setPickedSlotIdx(i);
                        setCustomStart(s.start);
                        setCustomEnd(s.end);
                      }}
                      sx={{ justifyContent: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </Box>

              <TextField
                select
                label="Status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                fullWidth
              >
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="REJECTED">Rejected</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </TextField>

              {(newStatus === 'SCHEDULED' || newStatus === 'APPROVED') && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <DateTimeField
                    label="Start"
                    value={customStart}
                    onChange={setCustomStart}
                  />
                  <DateTimeField
                    label="End"
                    value={customEnd}
                    onChange={setCustomEnd}
                    minDateTime={customStart ? new Date(customStart) : null}
                  />
                </Stack>
              )}

              <TextField
                label="Meeting link (optional)"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                fullWidth
                placeholder="https://meet.google.com/..."
              />
              <TextField
                label="Admin notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />

              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActive(null)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save & Notify'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)}>
        <DialogTitle>Delete this request?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}
