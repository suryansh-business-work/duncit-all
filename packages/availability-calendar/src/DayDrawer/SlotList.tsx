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
  Stack,
  Typography,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { format, isSameDay } from 'date-fns';
import type { VenueSlotRow } from '../types';

const priceLabel = (price: number) => (price > 0 ? `₹${price}` : 'Free');

const STATUS_COLOR: Record<VenueSlotRow['status'], 'success' | 'info' | 'warning' | 'default'> = {
  AVAILABLE: 'success',
  PENDING: 'info',
  BOOKED: 'warning',
  BLOCKED: 'default',
};

// PENDING = a live booking request; decide it in Slot Requests, don't edit it.
const LOCKED_STATUSES = new Set<VenueSlotRow['status']>(['BOOKED', 'PENDING']);

/** "10:00 AM – 06:00 PM", or the date-aware / whole-day variants for slots
 * that span days or book the entire date(s). */
export function slotWhenLabel(slot: Pick<VenueSlotRow, 'start_at' | 'end_at' | 'whole_day'>): string {
  const start = new Date(slot.start_at);
  const end = new Date(slot.end_at);
  // The end instant is exclusive: ending exactly at midnight claims no extra day.
  const multiDay = !isSameDay(start, new Date(end.getTime() - 1));
  if (slot.whole_day) {
    return multiDay ? `Whole day · ${format(start, 'dd MMM')} – ${format(end, 'dd MMM')}` : 'Whole day';
  }
  if (multiDay) {
    return `${format(start, 'dd MMM, hh:mm a')} – ${format(end, 'dd MMM, hh:mm a')}`;
  }
  return `${format(start, 'hh:mm a')} – ${format(end, 'hh:mm a')}`;
}

interface Props {
  slots: VenueSlotRow[];
  onToggleBlock: (slot: VenueSlotRow) => Promise<void>;
  onDelete: (slotId: string) => Promise<void>;
}

/** The existing-slots list with block/delete actions and the delete confirm. */
export default function SlotList({ slots, onToggleBlock, onDelete }: Readonly<Props>) {
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
        Existing slots
      </Typography>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
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
                  {slotWhenLabel(slot)}
                </Typography>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Typography variant="caption" fontWeight={800} color="text.secondary">
                    {priceLabel(slot.price)}
                  </Typography>
                  <Chip size="small" color={STATUS_COLOR[slot.status]} label={slot.status} />
                </Stack>
              </Stack>
              {slot.space_label && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {slot.space_label}
                  {slot.capacity ? ` · holds ${slot.capacity}` : ''}
                </Typography>
              )}
              {slot.booked_pod_title && (
                <Typography variant="caption" color="text.secondary">
                  {slot.status === 'PENDING' ? 'Requested by pod' : 'Booked by pod'}: {slot.booked_pod_title}
                </Typography>
              )}
              {slot.status === 'PENDING' && (
                <Typography variant="caption" color="info.main" sx={{ display: 'block' }}>
                  Awaiting your decision — approve or decline it under Slot Requests.
                </Typography>
              )}
              {slot.notes && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  {slot.notes}
                </Typography>
              )}
              {!LOCKED_STATUSES.has(slot.status) && (
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
    </Box>
  );
}
