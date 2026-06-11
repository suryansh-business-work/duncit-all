import { useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardIos';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { Slot, TIME_OPTIONS, buildMonth, isPastDay, isSameDay, slotKey } from './slotHelpers';

interface InterviewCalendarProps {
  anchor: Date;
  setAnchor: (d: Date) => void;
  selectedDate: Date | null;
  setSelectedDate: (d: Date) => void;
  slots: Map<string, Slot>;
  onToggleSlot: (date: Date, hhmm: string) => void;
  onRemoveSlot: (slot: Slot) => void;
}

export default function InterviewCalendar({
  anchor,
  setAnchor,
  selectedDate,
  setSelectedDate,
  slots,
  onToggleSlot,
  onRemoveSlot,
}: Readonly<InterviewCalendarProps>) {
  const cells = useMemo(() => buildMonth(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const slotList = Array.from(slots.values()).sort((a, b) => +a.start - +b.start);

  const goPrevMonth = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const next = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    if (
      next.getFullYear() < t.getFullYear() ||
      (next.getFullYear() === t.getFullYear() && next.getMonth() < t.getMonth())
    )
      return;
    setAnchor(next);
  };
  const goNextMonth = () =>
    setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{monthLabel}</Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={goPrevMonth}>
              <ArrowBackIcon fontSize="inherit" />
            </IconButton>
            <IconButton size="small" onClick={goNextMonth}>
              <ArrowForwardIcon fontSize="inherit" />
            </IconButton>
          </Stack>
        </Stack>
        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 0.5,
          }}
        >
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Typography
              key={`${d}-${i}`}
              variant="caption"
              align="center"
              color="text.secondary"
              sx={{ py: 1 }}
            >
              {d}
            </Typography>
          ))}
          {cells.map((d, idx) => {
            if (!d) return <Box key={idx} />;
            const past = isPastDay(d);
            const active = selectedDate && isSameDay(d, selectedDate);
            return (
              <Button
                key={idx}
                onClick={() => !past && setSelectedDate(d)}
                disabled={past}
                sx={{
                  minWidth: 0,
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  p: 0,
                  fontWeight: active ? 700 : 500,
                  bgcolor: active ? 'primary.main' : 'transparent',
                  color: active
                    ? 'primary.contrastText'
                    : past
                      ? 'text.disabled'
                      : 'text.primary',
                  '&:hover': { bgcolor: active ? 'primary.dark' : 'action.hover' },
                }}
              >
                {d.getDate()}
              </Button>
            );
          })}
        </Box>

        {selectedDate && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Pick time slots on{' '}
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {TIME_OPTIONS.map((t) => {
                const key = slotKey(selectedDate, t);
                const selected = slots.has(key);
                return (
                  <Chip
                    key={t}
                    label={t}
                    variant={selected ? 'filled' : 'outlined'}
                    color={selected ? 'primary' : 'default'}
                    onClick={() => onToggleSlot(selectedDate, t)}
                    icon={selected ? <CheckCircleIcon /> : undefined}
                  />
                );
              })}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Each slot is 1 hour. Choose up to 5 across any dates.
            </Typography>
          </Box>
        )}

        {slotList.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <EventAvailableIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">
                Your preferred slots ({slotList.length}/5)
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {slotList.map((s, i) => (
                <Chip
                  key={i}
                  label={`${s.start.toLocaleDateString(undefined, {
                    day: '2-digit',
                    month: 'short',
                  })} · ${s.start.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`}
                  onDelete={() => onRemoveSlot(s)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
