import { Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { CalendarUnit } from './calendar-grid';

const UNITS: readonly CalendarUnit[] = ['MONTH', 'WEEK', 'DAY'];

const UNIT_LABEL: Record<CalendarUnit, string> = {
  MONTH: 'marketing.social.viewMonth',
  WEEK: 'marketing.social.viewWeek',
  DAY: 'marketing.social.viewDay',
};

const PREVIOUS: Record<CalendarUnit, string> = {
  MONTH: 'marketing.social.previousMonth',
  WEEK: 'marketing.social.previousWeek',
  DAY: 'marketing.social.previousDay',
};

const NEXT: Record<CalendarUnit, string> = {
  MONTH: 'marketing.social.nextMonth',
  WEEK: 'marketing.social.nextWeek',
  DAY: 'marketing.social.nextDay',
};

interface Props {
  unit: CalendarUnit;
  title: string;
  onUnit: (unit: CalendarUnit) => void;
  /** Move by one of the unit, back or forward. */
  onStep: (by: -1 | 1) => void;
  onToday: () => void;
}

/** The calendar's controls: back and forward by the unit on screen, today, and the month / week / day switch. */
export default function CalendarHeader({ unit, title, onUnit, onStep, onToday }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Tooltip title={t(PREVIOUS[unit])}>
          <DuncitIconButton onClick={() => onStep(-1)}>
            <ChevronLeftIcon />
          </DuncitIconButton>
        </Tooltip>
        <Typography variant="h6" component="h2" sx={{ minWidth: 170, textAlign: 'center' }} aria-live="polite">
          {title}
        </Typography>
        <Tooltip title={t(NEXT[unit])}>
          <DuncitIconButton onClick={() => onStep(1)}>
            <ChevronRightIcon />
          </DuncitIconButton>
        </Tooltip>
        <DuncitButton size="small" variant="outlined" onClick={onToday}>
          {t('marketing.social.today')}
        </DuncitButton>
      </Stack>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={unit}
        onChange={(_event, next: CalendarUnit | null) => {
          if (next) onUnit(next);
        }}
        aria-label={t('marketing.social.calendarUnit')}
        data-testid="social-calendar-unit"
      >
        {UNITS.map((option) => (
          <ToggleButton key={option} value={option}>
            {t(UNIT_LABEL[option])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
