import { Box, Typography } from '@mui/material';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';
import type { CalendarView } from '../types';
import { DayBadges, DayHeader } from './DayParts';
import { cellColors, cellShape, type Bucket } from './helpers';

interface DayCellProps {
  date: Date;
  view: CalendarView;
  monthStart: Date;
  today: Date;
  maxDate?: Date;
  bucket?: Bucket;
  isHoliday: boolean;
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}

/** A single day tile with its A/P/B/× slot counts. Hoisted to module scope so
 *  it is never re-created per render (S6478). */
export function DayCell({ date, view, monthStart, today, maxDate, bucket, isHoliday, selectedDate, onSelect }: Readonly<DayCellProps>) {
  const { t } = useTranslation();
  const isOtherMonth = view === 'month' && !isSameMonth(date, monthStart);
  const isPast = date < today;
  // Days past the booking window (e.g. > 60 days out) are non-bookable, so they
  // are dimmed and non-interactive exactly like past days.
  const isBeyondMax = !!maxDate && date > maxDate;
  const isDisabled = isPast || isBeyondMax;
  const isSelected = !!selectedDate && isSameDay(date, selectedDate);
  const isToday = isSameDay(date, today);
  const isDayView = view === 'day';
  const { bgcolor, color } = cellColors(isSelected, isOtherMonth, isDisabled, isHoliday);
  const shape = cellShape(isDayView, isSelected, isDisabled);

  return (
    <Box
      data-testid={`availability-day-${format(date, 'yyyy-MM-dd')}`}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      aria-pressed={isSelected}
      onClick={isDisabled ? undefined : () => onSelect(date)}
      onKeyDown={
        isDisabled
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(date);
            }
      }
      sx={{
        aspectRatio: shape.aspectRatio,
        minHeight: shape.minHeight,
        p: { xs: 0.5, sm: 0.75 },
        borderRadius: 1.5,
        border: 1.5,
        borderColor: shape.borderColor,
        bgcolor,
        color,
        cursor: shape.cursor,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        position: 'relative',
        outline: 'none',
        '&:hover': { borderColor: shape.hoverBorderColor },
        '&:focus-visible': { boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}` },
      }}
    >
      <DayHeader date={date} isDayView={isDayView} isToday={isToday} isHoliday={isHoliday} />
      {isHoliday && isDayView && (
        <Typography variant="caption" sx={{ fontWeight: 800 }}>
          {t('availability.onLeaveNotBookable')}
        </Typography>
      )}
      <DayBadges bucket={bucket} isSelected={isSelected} />
    </Box>
  );
}
