import { Box, Typography } from '@mui/material';
import { format, startOfMonth } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import { weekdayLabels } from '@duncit/slots';
import type { CalendarView, VenueSlotRow } from '../types';
import { DayCell } from './DayCell';
import { WEEKDAY_KEYS, bucketByDay, buildCells } from './helpers';

interface Props {
  month: Date;
  view?: CalendarView;
  slots: VenueSlotRow[];
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  /** Venue leave/holiday dates ('yyyy-MM-dd') — rendered red; never bookable. */
  holidays?: string[];
  /** Latest selectable day — days after this are dimmed and non-interactive
   *  (e.g. the 60-day booking window). Omit for no upper bound. */
  maxDate?: Date;
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
  maxDate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const weekdays = weekdayLabels(t).short;
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
    <Box data-testid="availability-grid">
      {view !== 'day' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: { xs: 0.5, sm: 1 }, mb: 1 }}>
          {weekdays.map((label, i) => (
            <Typography
              key={WEEKDAY_KEYS[i]}
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
            maxDate={maxDate}
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
