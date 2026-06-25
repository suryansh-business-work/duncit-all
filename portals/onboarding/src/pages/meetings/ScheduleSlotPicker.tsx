import { useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { MeetingSlot } from './queries';
import { CAL } from './calendarColors';

interface Props {
  slots: MeetingSlot[];
  value: string;
  onChange: (startAt: string) => void;
}

const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

const slotSx = (selected: boolean, available: boolean) => {
  if (!available) return { bgcolor: CAL.blocked, color: '#fff', opacity: 0.55 };
  if (selected) return { bgcolor: CAL.selected, color: '#fff' };
  return { color: CAL.available, borderColor: CAL.available };
};

/** Day + time-slot grid for onboarding staff scheduling — already-booked slots
 * are disabled, mirroring the applicant-facing gate picker. */
export default function ScheduleSlotPicker({ slots, value, onChange }: Readonly<Props>) {
  const [day, setDay] = useState('');
  const days: string[] = [];
  for (const s of slots) {
    if (!days.some((d) => dayKey(d) === dayKey(s.start_at))) days.push(s.start_at);
  }
  const activeDay = day || days[0] || '';
  const daySlots = slots.filter((s) => dayKey(s.start_at) === dayKey(activeDay));

  return (
    <Stack spacing={1.5}>
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
              variant={value === s.start_at ? 'filled' : 'outlined'}
              onClick={() => onChange(s.start_at)}
              sx={{ fontWeight: 800, ...slotSx(value === s.start_at, s.available) }}
            />
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Green slots are open, blue is your pick, grey ones are already booked.
        </Typography>
      </Box>
    </Stack>
  );
}
