import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { format, isAfter, set as setTimeOnDate } from 'date-fns';
import type { NewSlotInput, VenueSlotRow } from './types';

interface Props {
  open: boolean;
  date: Date | null;
  slots: VenueSlotRow[];
  onClose: () => void;
  onCreate: (input: NewSlotInput) => Promise<void>;
  onToggleBlock: (slot: VenueSlotRow) => Promise<void>;
  onDelete: (slotId: string) => Promise<void>;
}

const STATUS_COLOR: Record<VenueSlotRow['status'], 'success' | 'warning' | 'default'> = {
  AVAILABLE: 'success',
  BOOKED: 'warning',
  BLOCKED: 'default',
};

function combineDateAndTime(date: Date, time: Date): Date {
  return setTimeOnDate(date, {
    hours: time.getHours(),
    minutes: time.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
}

/** The day slot editor (list + block/delete + add). Prop-driven: it owns the
 *  form + confirm UX, the host app wires the create/update/delete calls. */
export default function DayDrawer({ open, date, slots, onClose, onCreate, onToggleBlock, onDelete }: Readonly<Props>) {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const reset = () => {
    setStartTime(null);
    setEndTime(null);
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = async () => {
    setError(null);
    if (!date || !startTime || !endTime) {
      setError('Pick start and end time.');
      return;
    }
    const start = combineDateAndTime(date, startTime);
    const end = combineDateAndTime(date, endTime);
    if (!isAfter(end, start)) {
      setError('End must be after start.');
      return;
    }
    if (isAfter(new Date(), start)) {
      setError('Start time must be in the future.');
      return;
    }
    setCreating(true);
    try {
      await onCreate({ start_at: start.toISOString(), end_at: end.toISOString(), notes });
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create slot');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleBlock = async (slot: VenueSlotRow) => {
    try {
      await onToggleBlock(slot);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update slot');
    }
  };

  const handleConfirmDelete = async () => {
    const slotId = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!slotId) return;
    try {
      await onDelete(slotId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete slot');
    }
  };

  return (
    <Drawer anchor="right" open={open && !!date} onClose={handleClose} PaperProps={{ sx: { width: { xs: '100%', sm: 380 } } }}>
      <Stack spacing={2} sx={{ p: 2, height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
              Availability
            </Typography>
            <Typography variant="h6" fontWeight={900}>
              {date ? format(date, 'EEEE, dd MMM yyyy') : ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            Existing slots
          </Typography>
          {slots.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No slots for this date yet.
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {slots.map((slot) => (
                <Box key={slot.id} sx={{ p: 1.25, borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight={800}>
                      {format(new Date(slot.start_at), 'hh:mm a')} – {format(new Date(slot.end_at), 'hh:mm a')}
                    </Typography>
                    <Chip size="small" color={STATUS_COLOR[slot.status]} label={slot.status} />
                  </Stack>
                  {slot.booked_pod_title && (
                    <Typography variant="caption" color="text.secondary">
                      Booked by pod: {slot.booked_pod_title}
                    </Typography>
                  )}
                  {slot.notes && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      {slot.notes}
                    </Typography>
                  )}
                  {slot.status !== 'BOOKED' && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        startIcon={slot.status === 'BLOCKED' ? <CheckIcon /> : <BlockIcon />}
                        onClick={() => handleToggleBlock(slot)}
                      >
                        {slot.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                      </Button>
                      <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setConfirmDeleteId(slot.id)}>
                        Delete
                      </Button>
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
            Add a new slot
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1}>
              <TimePicker label="Start" value={startTime} onChange={setStartTime} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              <TimePicker label="End" value={endTime} onChange={setEndTime} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            </Stack>
            <TextField size="small" label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} inputProps={{ maxLength: 280 }} />
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
            <Button variant="contained" disabled={creating} onClick={handleAdd}>
              {creating ? 'Adding…' : 'Add slot'}
            </Button>
          </Stack>
        </Box>
      </Stack>

      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
        <DialogTitle>Delete this slot?</DialogTitle>
        <DialogContent>
          <DialogContentText>This permanently removes the time slot. Booked slots cannot be deleted.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
