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
import type { CalendarView, VenueSlotRow } from './types';

interface Props {
  month: Date;
  view?: CalendarView;
  slots: VenueSlotRow[];
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  /** Venue leave/holiday dates ('yyyy-MM-dd') — rendered red; never bookable. */
  holidays?: string[];
}

interface Bucket {
  available: number;
  pending: number;
  booked: number;
  blocked: number;
}

function bucketByDay(slots: VenueSlotRow[]): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  for (const slot of slots) {
    const key = format(new Date(slot.start_at), 'yyyy-MM-dd');
    const bucket = map.get(key) ?? { available: 0, pending: 0, booked: 0, blocked: 0 };
    if (slot.status === 'AVAILABLE') bucket.available += 1;
    else if (slot.status === 'PENDING') bucket.pending += 1;
    else if (slot.status === 'BOOKED') bucket.booked += 1;
    else bucket.blocked += 1;
    map.set(key, bucket);
  }
  return map;
}

// Flat (non-nested) colour resolution keeps the JSX free of nested ternaries.
function cellColors(isSelected: boolean, isOtherMonth: boolean, isPast: boolean, isHoliday: boolean) {
  if (isSelected) return { bgcolor: 'primary.main', color: 'primary.contrastText' };
  if (isOtherMonth) return { bgcolor: 'transparent', color: 'text.disabled' };
  if (isHoliday) return { bgcolor: 'error.light', color: 'error.contrastText' };
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

// The visible day cells for the active view: a single day, the anchor's week, or
// the full 6×7 month grid.
function buildCells(view: CalendarView, month: Date, anchor: Date): Date[] {
  if (view === 'day') return [anchor];
  if (view === 'week') {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const cells: Date[] = [];
  let cursor = gridStart;
  // 6 rows × 7 cols always fits any month.
  for (let i = 0; i < 42; i += 1) {
    cells.push(cursor);
    cursor = addDays(cursor, 1);
    if (i >= 28 && cursor > monthEnd && cursor.getDay() === 0) break;
  }
  return cells;
}

interface DayCellProps {
  date: Date;
  view: CalendarView;
  monthStart: Date;
  today: Date;
  bucket?: Bucket;
  isHoliday: boolean;
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}

/** A single day tile with its A/P/B/× slot counts. Hoisted to module scope so
 *  it is never re-created per render (S6478). */
function DayCell({ date, view, monthStart, today, bucket, isHoliday, selectedDate, onSelect }: Readonly<DayCellProps>) {
  const isOtherMonth = view === 'month' && !isSameMonth(date, monthStart);
  const isPast = date < today;
  const isSelected = !!selectedDate && isSameDay(date, selectedDate);
  const isToday = isSameDay(date, today);
  const isDayView = view === 'day';
  const { bgcolor, color } = cellColors(isSelected, isOtherMonth, isPast, isHoliday);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(date)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(date);
      }}
      sx={{
        aspectRatio: isDayView ? undefined : '1 / 1',
        minHeight: isDayView ? 120 : undefined,
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
          {isDayView ? format(date, 'EEEE, dd MMM') : format(date, 'd')}
        </Typography>
        {isHoliday && !isDayView && (
          <Typography variant="caption" sx={{ fontSize: 9, fontWeight: 800 }} aria-label="Venue on leave">
            LEAVE
          </Typography>
        )}
      </Stack>
      {isHoliday && isDayView && (
        <Typography variant="caption" sx={{ fontWeight: 800 }}>
          Venue on leave — not bookable
        </Typography>
      )}
      {bucket && (
        <Stack direction="row" spacing={0.25} flexWrap="wrap" sx={{ rowGap: 0.25 }}>
          <CountBadge count={bucket.available} selected={isSelected} label="A" bg="success.light" fg="success.contrastText" />
          <CountBadge count={bucket.pending} selected={isSelected} label="P" bg="info.light" fg="info.contrastText" />
          <CountBadge count={bucket.booked} selected={isSelected} label="B" bg="warning.light" fg="warning.contrastText" />
          <CountBadge count={bucket.blocked} selected={isSelected} label="×" bg="grey.300" fg="text.secondary" />
        </Stack>
      )}
    </Box>
  );
}

/** Day/Week/Month slot calendar showing per-day counts (A/B/×). Pure +
 *  prop-driven so any portal can render it; the host wires data, the active
 *  view, and the day-click handler. */
export default function AvailabilityCalendar({
  month,
  view = 'month',
  slots,
  selectedDate,
  onSelect,
  holidays = [],
}: Readonly<Props>) {
  const buckets = bucketByDay(slots);
  const holidaySet = new Set(holidays);
  const monthStart = startOfMonth(month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // `month` is the universal anchor: the month for month view, and the in-range
  // day for week/day views (the host drives it). `selectedDate` only highlights.
  const cells = buildCells(view, month, month);
  const cols = view === 'day' ? 1 : 7;

  return (
    <Box>
      {view !== 'day' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: { xs: 0.5, sm: 1 }, mb: 1 }}>
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
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: { xs: 0.5, sm: 1 } }}>
        {cells.map((date) => (
          <DayCell
            key={format(date, 'yyyy-MM-dd')}
            date={date}
            view={view}
            monthStart={monthStart}
            today={today}
            bucket={buckets.get(format(date, 'yyyy-MM-dd'))}
            isHoliday={holidaySet.has(format(date, 'yyyy-MM-dd'))}
            selectedDate={selectedDate}
            onSelect={onSelect}
          />
        ))}
      </Box>
    </Box>
  );
}
