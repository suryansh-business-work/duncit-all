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
import type { VenueSlotRow } from './queries';

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
  for (const s of slots) {
    const key = format(new Date(s.start_at), 'yyyy-MM-dd');
    const b = map.get(key) ?? { available: 0, booked: 0, blocked: 0 };
    if (s.status === 'AVAILABLE') b.available++;
    else if (s.status === 'BOOKED') b.booked++;
    else b.blocked++;
    map.set(key, b);
  }
  return map;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  for (let i = 0; i < 42; i++) {
    cells.push(cursor);
    cursor = addDays(cursor, 1);
    if (i >= 28 && cursor > monthEnd && cursor.getDay() === 0) break;
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: { xs: 0.5, sm: 1 },
          mb: 1,
        }}
      >
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
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: { xs: 0.5, sm: 1 },
        }}
      >
        {cells.map((date) => {
          const key = format(date, 'yyyy-MM-dd');
          const bucket = buckets.get(key);
          const isOtherMonth = !isSameMonth(date, monthStart);
          const isPast = date < today;
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);

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
                bgcolor: isSelected
                  ? 'primary.main'
                  : isOtherMonth
                    ? 'transparent'
                    : 'background.paper',
                color: isSelected
                  ? 'primary.contrastText'
                  : isOtherMonth
                    ? 'text.disabled'
                    : isPast
                      ? 'text.disabled'
                      : 'text.primary',
                cursor: 'pointer',
                opacity: isOtherMonth ? 0.5 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                position: 'relative',
                outline: 'none',
                '&:hover': {
                  borderColor: 'primary.main',
                },
                '&:focus-visible': {
                  boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isToday ? 900 : 600,
                    textDecoration: isToday ? 'underline' : 'none',
                  }}
                >
                  {format(date, 'd')}
                </Typography>
              </Stack>
              {bucket && (
                <Stack direction="row" spacing={0.25} flexWrap="wrap" sx={{ rowGap: 0.25 }}>
                  {bucket.available > 0 && (
                    <Box
                      sx={{
                        px: 0.5,
                        py: 0,
                        borderRadius: 0.5,
                        bgcolor: isSelected ? 'rgba(255,255,255,0.25)' : 'success.light',
                        color: isSelected ? 'primary.contrastText' : 'success.contrastText',
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {bucket.available}A
                    </Box>
                  )}
                  {bucket.booked > 0 && (
                    <Box
                      sx={{
                        px: 0.5,
                        py: 0,
                        borderRadius: 0.5,
                        bgcolor: isSelected ? 'rgba(255,255,255,0.25)' : 'warning.light',
                        color: isSelected ? 'primary.contrastText' : 'warning.contrastText',
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {bucket.booked}B
                    </Box>
                  )}
                  {bucket.blocked > 0 && (
                    <Box
                      sx={{
                        px: 0.5,
                        py: 0,
                        borderRadius: 0.5,
                        bgcolor: isSelected ? 'rgba(255,255,255,0.25)' : 'grey.300',
                        color: isSelected ? 'primary.contrastText' : 'text.secondary',
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {bucket.blocked}×
                    </Box>
                  )}
                </Stack>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
