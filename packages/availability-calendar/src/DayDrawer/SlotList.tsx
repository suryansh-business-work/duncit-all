import { useState } from 'react';
import { Alert, Box, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Typography } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { isSameDay } from 'date-fns';
import type { VenueSlotRow } from '../types';
import { formatDate, formatDateTime, formatTime } from '@duncit/datetime';
import { useTranslation } from '@duncit/app-settings';

/** The translator this list and its label helper read their copy from. */
type Translate = ReturnType<typeof useTranslation>['t'];

const priceLabel = (price: number, t: Translate) =>
  price > 0 ? `₹${price}` : t('shell.availability.free');

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
export function slotWhenLabel(
  slot: Pick<VenueSlotRow, 'start_at' | 'end_at' | 'whole_day'>,
  t: Translate,
): string {
  const start = new Date(slot.start_at);
  const end = new Date(slot.end_at);
  // The end instant is exclusive: ending exactly at midnight claims no extra day.
  const multiDay = !isSameDay(start, new Date(end.getTime() - 1));
  if (slot.whole_day) {
    if (!multiDay) return t('shell.slots.wholeDay');
    return t('shell.availability.wholeDayRange', {
      vars: { from: formatDate(start), to: formatDate(end) },
    });
  }
  if (multiDay) {
    return t('shell.availability.timeRange', {
      vars: { from: formatDateTime(start), to: formatDateTime(end) },
    });
  }
  return t('shell.availability.timeRange', {
    vars: { from: formatTime(start), to: formatTime(end) },
  });
}

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

  const handleToggleBlock = async (slot: VenueSlotRow) => {
    try {
      await onToggleBlock(slot);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('shell.availability.updateFailed'));
    }
  };

  const handleConfirmDelete = async () => {
    const slotId = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!slotId) return;
    try {
      await onDelete(slotId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('shell.availability.deleteFailed'));
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
        {t('shell.availability.existingSlots')}
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
          {t('shell.availability.noSlotsForDate')}
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {slots.map((slot) => (
            <Box key={slot.id} sx={{ p: 1.25, borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                <Typography variant="body2" sx={{
                  fontWeight: 800
                }}>
                  {slotWhenLabel(slot, t)}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{
                  alignItems: "center"
                }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      color: "text.secondary"
                    }}>
                    {priceLabel(slot.price, t)}
                  </Typography>
                  <Chip size="small" color={STATUS_COLOR[slot.status]} label={slot.status} />
                </Stack>
              </Stack>
              {slot.space_label && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: 'block'
                  }}>
                  {slot.space_label}
                  {slot.capacity
                    ? ` · ${t('shell.availability.holdsCapacity', { vars: { capacity: slot.capacity } })}`
                    : ''}
                </Typography>
              )}
              {slot.booked_pod_title && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {slot.status === 'PENDING'
                    ? t('shell.availability.requestedByPod')
                    : t('shell.availability.bookedByPod')}
                  : {slot.booked_pod_title}
                </Typography>
              )}
              {slot.status === 'PENDING' && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "info.main",
                    display: 'block'
                  }}>
                  {t('shell.availability.awaitingDecision')}
                </Typography>
              )}
              {slot.notes && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  {slot.notes}
                </Typography>
              )}
              {!LOCKED_STATUSES.has(slot.status) && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <DuncitButton
                    size="small"
                    startIcon={slot.status === 'BLOCKED' ? <CheckIcon /> : <BlockIcon />}
                    onClick={() => handleToggleBlock(slot)}
                  >
                    {slot.status === 'BLOCKED'
                      ? t('shell.availability.unblock')
                      : t('shell.availability.block')}
                  </DuncitButton>
                  <DuncitButton
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setConfirmDeleteId(slot.id)}
                  >
                    {t('shell.common.delete')}
                  </DuncitButton>
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
        <DialogTitle>{t('shell.availability.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('shell.availability.deleteBody')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setConfirmDeleteId(null)}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton color="error" variant="contained" onClick={handleConfirmDelete}>
            {t('shell.common.delete')}
          </DuncitButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
