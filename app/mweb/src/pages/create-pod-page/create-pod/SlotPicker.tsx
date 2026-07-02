import { format } from 'date-fns';
import { Box, Chip, CircularProgress, FormHelperText, Stack, Typography } from '@mui/material';
import type { CreatePodSlot } from './create-pod.types';

interface Props {
  slots: CreatePodSlot[];
  loading: boolean;
  selectedSlotId: string;
  onPick: (slot: CreatePodSlot) => void;
  error?: string;
}

const slotLabel = (slot: CreatePodSlot) =>
  `${format(new Date(slot.start_at), 'h:mm a')} – ${format(new Date(slot.end_at), 'h:mm a')}${
    slot.price > 0 ? ` · ₹${slot.price.toLocaleString('en-IN')}` : ' · Free'
  }`;

/** Available slots from the venue partner's calendar, grouped by day. */
export default function SlotPicker({ slots, loading, selectedSlotId, onPick, error }: Readonly<Props>) {
  const byDay = new Map<string, CreatePodSlot[]>();
  for (const slot of slots) {
    const key = format(new Date(slot.start_at), 'yyyy-MM-dd');
    byDay.set(key, [...(byDay.get(key) ?? []), slot]);
  }
  const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={800}>
        Available slots
      </Typography>
      <Typography variant="caption" color="text.secondary">
        From the venue's availability calendar — the slot decides your pod's date & time.
      </Typography>
      {loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}
      {!loading && days.length === 0 && (
        <Typography variant="body2" color="text.secondary" data-testid="create-pod-no-slots">
          This venue has no open slots right now. Try another venue or check back later.
        </Typography>
      )}
      {days.map((day) => (
        <Box key={day}>
          <Typography variant="caption" fontWeight={800} color="text.secondary">
            {format(new Date(`${day}T00:00:00`), 'EEE, d MMM yyyy')}
          </Typography>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75, mt: 0.5 }}>
            {(byDay.get(day) ?? []).map((slot) => (
              <Chip
                key={slot.id}
                label={slotLabel(slot)}
                clickable
                color={selectedSlotId === slot.id ? 'primary' : 'default'}
                variant={selectedSlotId === slot.id ? 'filled' : 'outlined'}
                onClick={() => onPick(slot)}
                data-testid={`create-pod-slot-${slot.id}`}
              />
            ))}
          </Stack>
        </Box>
      ))}
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
}
