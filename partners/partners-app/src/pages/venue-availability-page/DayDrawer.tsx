import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import {
  CREATE_VENUE_SLOTS,
  DELETE_VENUE_SLOT,
  UPDATE_VENUE_SLOT,
  type VenueSlotRow,
} from './queries';

interface Props {
  venueId: string;
  open: boolean;
  date: Date | null;
  slots: VenueSlotRow[];
  onClose: () => void;
  onChanged: () => void;
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

export default function DayDrawer({ venueId, open, date, slots, onClose, onChanged }: Readonly<Props>) {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [createSlots, { loading: creating }] = useMutation(CREATE_VENUE_SLOTS);
  const [updateSlot] = useMutation(UPDATE_VENUE_SLOT);
  const [deleteSlot] = useMutation(DELETE_VENUE_SLOT);

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
    try {
      await createSlots({
        variables: {
          input: {
            venue_id: venueId,
            slots: [{ start_at: start.toISOString(), end_at: end.toISOString(), notes }],
          },
        },
      });
      reset();
      onChanged();
    } catch (e: any) {
      setError(e?.message || 'Could not create slot');
    }
  };

  const handleDelete = async (slotId: string) => {
    if (!window.confirm('Delete this slot?')) return;
    try {
      await deleteSlot({ variables: { slot_id: slotId } });
      onChanged();
    } catch (e: any) {
      setError(e?.message || 'Could not delete slot');
    }
  };

  const handleToggleBlock = async (slot: VenueSlotRow) => {
    try {
      await updateSlot({
        variables: {
          slot_id: slot.id,
          input: { block: slot.status !== 'BLOCKED' },
        },
      });
      onChanged();
    } catch (e: any) {
      setError(e?.message || 'Could not update slot');
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open && !!date}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 380 } } }}
    >
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
          <IconButton size="small" onClick={handleClose}>
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
                <Box
                  key={slot.id}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
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
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={() => handleDelete(slot.id)}
                      >
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
              <TimePicker
                label="Start"
                value={startTime}
                onChange={setStartTime}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <TimePicker
                label="End"
                value={endTime}
                onChange={setEndTime}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Stack>
            <TextField
              size="small"
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              inputProps={{ maxLength: 280 }}
            />
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
            <Button variant="contained" disabled={creating} onClick={handleAdd}>
              {creating ? 'Adding…' : 'Add slot'}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Drawer>
  );
}
