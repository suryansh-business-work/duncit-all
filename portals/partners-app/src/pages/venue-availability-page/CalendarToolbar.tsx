import { Button, IconButton, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import TodayIcon from '@mui/icons-material/Today';
import type { CalendarView } from '@duncit/availability-calendar';
import { useTranslation } from '@duncit/shell';

interface Props {
  view: CalendarView;
  onView: (view: CalendarView) => void;
  /** "August 2026", "03 Aug – 09 Aug" or the single day, per the active view. */
  periodLabel: string;
  onShift: (direction: 1 | -1) => void;
  /** False at the end of the booking window — there is nothing further to show. */
  canGoNext: boolean;
  onToday: () => void;
  onRecurring: () => void;
}

/** The calendar's controls: which view, which period, and the way into the
 *  recurring-availability dialog. Stateless — the page owns the anchor. */
export default function CalendarToolbar({
  view,
  onView,
  periodLabel,
  onShift,
  canGoNext,
  onToday,
  onRecurring,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      alignItems={{ xs: 'stretch', md: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <ToggleButtonGroup
        size="small"
        exclusive
        value={view}
        onChange={(_e, next) => next && onView(next)}
        aria-label={t('partners.venueAvailabilityPage.calendarView')}
      >
        <ToggleButton value="day">Day</ToggleButton>
        <ToggleButton value="week">Week</ToggleButton>
        <ToggleButton value="month">{t('partners.venueAvailabilityPage.month')}</ToggleButton>
      </ToggleButtonGroup>

      <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
        <IconButton onClick={() => onShift(-1)} aria-label={t('partners.venueAvailabilityPage.previous')}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle1" fontWeight={900} sx={{ minWidth: 160, textAlign: 'center' }}>
          {periodLabel}
        </Typography>
        <IconButton
          onClick={() => onShift(1)}
          aria-label={t('partners.venueAvailabilityPage.next')}
          disabled={!canGoNext}
        >
          <ChevronRightIcon />
        </IconButton>
        <Button size="small" startIcon={<TodayIcon />} onClick={onToday}>
          Today
        </Button>
      </Stack>

      <Button variant="outlined" startIcon={<EventRepeatIcon />} onClick={onRecurring}>
        Recurring availability
      </Button>
    </Stack>
  );
}
