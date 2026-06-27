import { useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { MeetingSlot } from './queries';

interface Props {
  slots: MeetingSlot[];
  value: string;
  onChange: (startAt: string) => void;
  /** The user's currently-booked slot (reschedule): shown for reference, not re-selectable. */
  currentSlot?: string | null;
}

const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

const chipColor = (selected: boolean, isCurrent: boolean): 'primary' | 'secondary' | 'default' => {
  if (selected) return 'primary';
  if (isCurrent) return 'secondary';
  return 'default';
};

/** Day + time-slot chip grid for onboarding meetings; booked slots are disabled.
 * On reschedule, the current slot is marked and locked (must pick a different one). */
export default function SlotPicker({ slots, value, onChange, currentSlot }: Readonly<Props>) {
  const [day, setDay] = useState('');
  const days: string[] = [];
  for (const s of slots) {
    if (!days.some((d) => dayKey(d) === dayKey(s.start_at))) days.push(s.start_at);
  }
  const activeDay = day || days[0] || '';
  const daySlots = slots.filter((s) => dayKey(s.start_at) === dayKey(activeDay));
  const hint = currentSlot
    ? 'Greyed-out slots are booked; your current slot is marked and can’t be re-selected.'
    : 'Greyed-out slots are already booked.';

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Day</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {days.map((d) => (
            <Chip
              key={d}
              label={dayLabel(d)}
              color={dayKey(d) === dayKey(activeDay) ? 'primary' : 'default'}
              onClick={() => { setDay(d); onChange(''); }}
              sx={{ fontWeight: 800 }}
            />
          ))}
        </Stack>
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Time slot</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {daySlots.map((s) => {
            const isCurrent = !!currentSlot && s.start_at === currentSlot;
            const selectable = s.available && !isCurrent;
            return (
              <Chip
                key={s.start_at}
                label={isCurrent ? `${timeLabel(s.start_at)} · current` : timeLabel(s.start_at)}
                disabled={!selectable}
                color={chipColor(value === s.start_at, isCurrent)}
                variant={selectable ? 'filled' : 'outlined'}
                onClick={() => selectable && onChange(s.start_at)}
                sx={{ fontWeight: 800, ...(isCurrent ? { borderStyle: 'dashed' } : {}) }}
              />
            );
          })}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </Box>
    </Stack>
  );
}
