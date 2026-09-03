import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import TodayIcon from '@mui/icons-material/Today';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { CalendarView } from './types';

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
 *  recurring-availability dialog. Stateless — the host owns the anchor. */
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
      spacing={1.5}
      sx={{
        alignItems: { xs: 'stretch', md: 'center' },
        justifyContent: 'space-between',
        mb: 2,
      }}
    >
      <ToggleButtonGroup
        size="small"
        exclusive
        value={view}
        onChange={(_e, next) => next && onView(next)}
        aria-label={t('availability.toolbar.calendarView')}
      >
        <ToggleButton value="day">{t('availability.toolbar.day')}</ToggleButton>
        <ToggleButton value="week">{t('availability.toolbar.week')}</ToggleButton>
        <ToggleButton value="month">{t('availability.toolbar.month')}</ToggleButton>
      </ToggleButtonGroup>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <DuncitIconButton onClick={() => onShift(-1)} aria-label={t('availability.toolbar.previous')}>
          <ChevronLeftIcon />
        </DuncitIconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, minWidth: 160, textAlign: 'center' }}>
          {periodLabel}
        </Typography>
        <DuncitIconButton
          onClick={() => onShift(1)}
          aria-label={t('availability.toolbar.next')}
          disabled={!canGoNext}
        >
          <ChevronRightIcon />
        </DuncitIconButton>
        <DuncitButton size="small" startIcon={<TodayIcon />} onClick={onToday}>
          {t('availability.toolbar.today')}
        </DuncitButton>
      </Stack>

      <DuncitButton variant="outlined" startIcon={<EventRepeatIcon />} onClick={onRecurring}>
        {t('availability.toolbar.recurring')}
      </DuncitButton>
    </Stack>
  );
}
