import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DateTimeField from '../../components/DateTimeField';

interface Props {
  active: any | null;
  saving: boolean;
  error: string | null;
  newStatus: string;
  setNewStatus: (s: string) => void;
  pickedSlotIdx: number;
  setPickedSlotIdx: (n: number) => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (s: string) => void;
  meetingLink: string;
  setMeetingLink: (s: string) => void;
  notes: string;
  setNotes: (s: string) => void;
  fmtSlotLong: (s: { start: string; end: string }) => string;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ManageInterviewDialog({
  active,
  saving,
  error,
  newStatus,
  setNewStatus,
  pickedSlotIdx,
  setPickedSlotIdx,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  meetingLink,
  setMeetingLink,
  notes,
  setNotes,
  fmtSlotLong,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Dialog open={!!active} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Manage Interview Request</DialogTitle>
      <DialogContent>
        {active && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="subtitle2">
                {active.applicant_name} · {active.type}
              </Typography>
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
                <strong>Location:</strong>{' '}
                {[active.city, active.zone].filter(Boolean).join(' / ')}
              </Typography>
            )}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                About
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {active.about}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Preferred slots
              </Typography>
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
                <DateTimeField label="Start" value={customStart} onChange={setCustomStart} />
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
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Save & Notify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
