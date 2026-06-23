import { Box, Stack, Typography } from '@mui/material';
import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { VenueSlotRow } from './types';

interface Props {
  month: Date;
  slots: VenueSlotRow[];
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}

interface Bucket {
  available: number;
  booked: number;
  blocked: number;
}

function bucketByDay(slots: VenueSlotRow[]): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  for (const slot of slots) {
    const key = format(new Date(slot.start_at), 'yyyy-MM-dd');
    const bucket = map.get(key) ?? { available: 0, booked: 0, blocked: 0 };
    if (slot.status === 'AVAILABLE') bucket.available += 1;
    else if (slot.status === 'BOOKED') bucket.booked += 1;
    else bucket.blocked += 1;
    map.set(key, bucket);
  }
  return map;
}

// Flat (non-nested) colour resolution keeps the JSX free of nested ternaries.
function cellColors(isSelected: boolean, isOtherMonth: boolean, isPast: boolean) {
  if (isSelected) return { bgcolor: 'primary.main', color: 'primary.contrastText' };
  if (isOtherMonth) return { bgcolor: 'transparent', color: 'text.disabled' };
  if (isPast) return { bgcolor: 'background.paper', color: 'text.disabled' };
  return { bgcolor: 'background.paper', color: 'text.primary' };
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface BadgeProps {
  count: number;
  selected: boolean;
  label: string;
  bg: string;
  fg: string;
}

function CountBadge({ count, selected, label, bg, fg }: Readonly<BadgeProps>) {
  if (count <= 0) return null;
  return (
    <Box
      sx={{
        px: 0.5,
        py: 0,
        borderRadius: 0.5,
        bgcolor: selected ? 'rgba(255,255,255,0.25)' : bg,
        color: selected ? 'primary.contrastText' : fg,
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {count}
      {label}
    </Box>
  );
}

/** Month grid showing per-day slot counts (A/B/×). Pure + prop-driven so any
 *  portal can render it; the host wires data + the day-click handler. */
export default function AvailabilityCalendar({ month, slots, selectedDate, onSelect }: Readonly<Props>) {
  const buckets = bucketByDay(slots);
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: Date[] = [];
  let cursor = gridStart;
  // 6 rows × 7 cols always fits any month.
  for (let i = 0; i < 42; i += 1) {
    cells.push(cursor);
    cursor = addDays(cursor, 1);
    if (i >= 28 && cursor > monthEnd && cursor.getDay() === 0) break;
  }

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, sm: 1 }, mb: 1 }}>
        {WEEKDAY_LABELS.map((label) => (
          <Typography
            key={label}
            variant="caption"
            sx={{ fontWeight: 800, color: 'text.secondary', textAlign: 'center' }}
          >
            {label}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, sm: 1 } }}>
        {cells.map((date) => {
          const key = format(date, 'yyyy-MM-dd');
          const bucket = buckets.get(key);
          const isOtherMonth = !isSameMonth(date, monthStart);
          const isPast = date < today;
          const isSelected = !!selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const { bgcolor, color } = cellColors(isSelected, isOtherMonth, isPast);

          return (
            <Box
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(date)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(date)}
              sx={{
                aspectRatio: '1 / 1',
                p: { xs: 0.5, sm: 0.75 },
                borderRadius: 1.5,
                border: 1.5,
                borderColor: isSelected ? 'primary.main' : 'divider',
                bgcolor,
                color,
                cursor: 'pointer',
                opacity: isOtherMonth ? 0.5 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                position: 'relative',
                outline: 'none',
                '&:hover': { borderColor: 'primary.main' },
                '&:focus-visible': { boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}` },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography
                  variant="body2"
                  sx={{ fontWeight: isToday ? 900 : 600, textDecoration: isToday ? 'underline' : 'none' }}
                >
                  {format(date, 'd')}
                </Typography>
              </Stack>
              {bucket && (
                <Stack direction="row" spacing={0.25} flexWrap="wrap" sx={{ rowGap: 0.25 }}>
                  <CountBadge count={bucket.available} selected={isSelected} label="A" bg="success.light" fg="success.contrastText" />
                  <CountBadge count={bucket.booked} selected={isSelected} label="B" bg="warning.light" fg="warning.contrastText" />
                  <CountBadge count={bucket.blocked} selected={isSelected} label="×" bg="grey.300" fg="text.secondary" />
                </Stack>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
