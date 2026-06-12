import { useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { MeetingSlot } from './queries';

interface Props {
  slots: MeetingSlot[];
  value: string;
  onChange: (startAt: string) => void;
}

const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** Day + time-slot chip grid for onboarding meetings; booked slots are disabled. */
export default function SlotPicker({ slots, value, onChange }: Readonly<Props>) {
  const [day, setDay] = useState('');
  const days: string[] = [];
  for (const s of slots) {
    if (!days.some((d) => dayKey(d) === dayKey(s.start_at))) days.push(s.start_at);
  }
  const activeDay = day || days[0] || '';
  const daySlots = slots.filter((s) => dayKey(s.start_at) === dayKey(activeDay));

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
          {daySlots.map((s) => (
            <Chip
              key={s.start_at}
              label={timeLabel(s.start_at)}
              disabled={!s.available}
              color={value === s.start_at ? 'primary' : 'default'}
              variant={s.available ? 'filled' : 'outlined'}
              onClick={() => onChange(s.start_at)}
              sx={{ fontWeight: 800 }}
            />
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Greyed-out slots are already booked.
        </Typography>
      </Box>
    </Stack>
  );
}
