import { useState } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { Box, CircularProgress, FormHelperText, Stack, Typography } from '@mui/material';
import type { CreatePodSlot } from './create-pod.types';

interface Props {
  slots: CreatePodSlot[];
  loading: boolean;
  selectedSlotId: string;
  onPick: (slot: CreatePodSlot) => void;
  error?: string;
}

const dayKey = (iso: string) => format(new Date(iso), 'yyyy-MM-dd');

const dayLabel = (dayIso: string) => {
  const date = new Date(`${dayIso}T00:00:00`);
  if (isToday(date)) return `Today, ${format(date, 'MMM d')}`;
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
};

const priceLabel = (slot: CreatePodSlot) => (slot.price > 0 ? `₹${slot.price.toLocaleString('en-IN')}` : 'Free');

/** Reskinned slot picker — a row of day chips over a grid of time tiles. The
 * chosen tile sets the pod's date & time from the venue's availability calendar. */
export default function SlotPicker({ slots, loading, selectedSlotId, onPick, error }: Readonly<Props>) {
  const byDay = new Map<string, CreatePodSlot[]>();
  for (const slot of slots) {
    const key = dayKey(slot.start_at);
    byDay.set(key, [...(byDay.get(key) ?? []), slot]);
  }
  const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
  const selectedDay = slots.find((slot) => slot.id === selectedSlotId);
  const [override, setOverride] = useState<string | null>(null);
  const activeDay = override ?? (selectedDay ? dayKey(selectedDay.start_at) : days[0] ?? '');
  const daySlots = byDay.get(activeDay) ?? [];

  return (
    <Stack spacing={1.25}>
      <Box>
        <Typography variant="subtitle2" fontWeight={800}>Date</Typography>
        <Typography variant="caption" color="text.secondary">
          From the venue's availability calendar — the slot sets your pod's date & time.
        </Typography>
      </Box>
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
      {days.length > 0 && (
        <Stack direction="row" sx={{ gap: 0.75, overflowX: 'auto', pb: 0.5 }}>
          {days.map((day) => {
            const active = day === activeDay;
            return (
              <Box
                key={day}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onClick={() => setOverride(day)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOverride(day);
                  }
                }}
                sx={{
                  flex: '0 0 auto',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  border: 1,
                  borderColor: active ? 'primary.main' : 'divider',
                  bgcolor: active ? 'primary.main' : 'background.paper',
                  color: active ? 'primary.contrastText' : 'text.primary',
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {dayLabel(day)}
              </Box>
            );
          })}
        </Stack>
      )}
      {daySlots.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.75 }}>Available slots</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 1 }}>
            {daySlots.map((slot) => {
              const selected = slot.id === selectedSlotId;
              return (
                <Box
                  key={slot.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`${format(new Date(slot.start_at), 'h:mm a')} · ${priceLabel(slot)}`}
                  data-testid={`create-pod-slot-${slot.id}`}
                  onClick={() => onPick(slot)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPick(slot);
                    }
                  }}
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    border: selected ? 2 : 1,
                    borderColor: selected ? 'primary.main' : 'divider',
                    bgcolor: selected ? 'primary.main' : 'background.paper',
                    color: selected ? 'primary.contrastText' : 'text.primary',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 140ms ease',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Typography variant="body2" fontWeight={900}>{format(new Date(slot.start_at), 'h:mm a')}</Typography>
                  <Typography variant="caption" sx={{ color: selected ? 'primary.contrastText' : 'text.secondary' }}>
                    {priceLabel(slot)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
}
