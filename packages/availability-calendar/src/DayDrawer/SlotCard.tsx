import { Box, Chip, Stack, Typography } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { LOCKED_STATUSES, priceLabel, slotWhenLabel, STATUS_COLOR } from './slot-labels';
import type { VenueSlotRow } from '../types';

interface Props {
  slot: VenueSlotRow;
  /** Returns the write's promise — the Block button spins on it until the
   *  server answers, which is why this must not be a fire-and-forget call. */
  onToggleBlock: (slot: VenueSlotRow) => Promise<void>;
  onRequestDelete: (slotId: string) => void;
}

/** One published slot: when it is, what it costs, which space it sells, and —
 *  unless a booking has locked it — the block and delete actions. */
export default function SlotCard({ slot, onToggleBlock, onRequestDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const blocked = slot.status === 'BLOCKED';

  return (
    <Box sx={{ p: 1.25, borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
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
            ? ` · ${t('availability.holdsCapacity', { vars: { capacity: slot.capacity } })}`
            : ''}
        </Typography>
      )}
      {slot.booked_pod_title && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {slot.status === 'PENDING'
            ? t('availability.requestedByPod')
            : t('availability.bookedByPod')}
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
          {t('availability.awaitingDecision')}
        </Typography>
      )}
      {slot.notes && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          {slot.notes}
        </Typography>
      )}
      {!LOCKED_STATUSES.has(slot.status) && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          {/* The handler's promise is returned, not swallowed: DuncitButton
              spins for as long as the mutation and its refetch take. */}
          <DuncitButton
            size="small"
            startIcon={blocked ? <CheckIcon /> : <BlockIcon />}
            onClick={() => onToggleBlock(slot)}
          >
            {blocked ? t('availability.unblock') : t('availability.block')}
          </DuncitButton>
          <DuncitButton
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => onRequestDelete(slot.id)}
          >
            {t('availability.delete')}
          </DuncitButton>
        </Stack>
      )}
    </Box>
  );
}
