import { useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import SlotCard from './SlotCard';
import type { VenueSlotRow } from '../types';

interface Props {
  slots: VenueSlotRow[];
  onToggleBlock: (slot: VenueSlotRow) => Promise<void>;
  onDelete: (slotId: string) => Promise<void>;
}

/** The existing-slots list with block/delete actions and the delete confirm. */
export default function SlotList({ slots, onToggleBlock, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleToggleBlock = async (slot: VenueSlotRow) => {
    setError(null);
    try {
      await onToggleBlock(slot);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('availability.updateFailed'));
    }
  };

  /**
   * The confirm stays open for the whole round trip.
   *
   * It used to close on the click and delete afterwards, which left the owner
   * looking at an unchanged list with nothing running on screen — the slot
   * simply vanished a second later, or did not. Now the Delete button spins
   * where they pressed it, and the dialog closes on the server's answer.
   */
  const handleConfirmDelete = async () => {
    const slotId = confirmDeleteId;
    if (!slotId) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(slotId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('availability.deleteFailed'));
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <Box>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 900
        }}>
        {t('availability.existingSlots')}
      </Typography>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {slots.length === 0 ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 1
          }}>
          {t('availability.noSlotsForDate')}
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              onToggleBlock={handleToggleBlock}
              onRequestDelete={setConfirmDeleteId}
            />
          ))}
        </Stack>
      )}

      <Dialog open={!!confirmDeleteId} onClose={() => !deleting && setConfirmDeleteId(null)}>
        <DialogTitle>{t('availability.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('availability.deleteBody')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <DuncitButton disabled={deleting} onClick={() => setConfirmDeleteId(null)}>
            {t('availability.cancel')}
          </DuncitButton>
          <DuncitButton color="error" variant="contained" onClick={handleConfirmDelete}>
            {t('availability.delete')}
          </DuncitButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
