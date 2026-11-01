import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, LinearProgress, Stack, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { SOCIAL_CALENDAR, type SocialCalendarItem } from '../publish.queries';
import CalendarAgenda from './CalendarAgenda';
import CalendarHeader from './CalendarHeader';
import CalendarTable from './CalendarTable';
import { dayTitle, gridRange, monthTitle, shift, unitWeeks, type CalendarUnit } from './calendar-grid';

const AGENDA_EMPTY: Record<CalendarUnit, string> = {
  MONTH: 'marketing.social.calendarEmpty',
  WEEK: 'marketing.social.calendarEmptyWeek',
  DAY: 'marketing.social.calendarEmptyDay',
};

interface Props {
  /** A day's "+" was pressed: start a post dated that day. */
  onAdd: (day: string, today: string) => void;
  onOpen: (item: SocialCalendarItem) => void;
}

/**
 * The content calendar: every post written here and every post read back from
 * the networks, on the day it went (or goes) out, in the admin's time zone —
 * a month, a week or a day at a time.
 */
export default function CalendarView({ onAdd, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { dayKey, formatDay, now } = useDateFormat({ timeZoneAware: true });
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const today = dayKey(now());
  const [unit, setUnit] = useState<CalendarUnit>('MONTH');
  const [anchor, setAnchor] = useState(today);
  const month = anchor.slice(0, 7);
  const weeks = useMemo(() => unitWeeks(unit, anchor), [unit, anchor]);
  const { data, loading, error } = useQuery<{ socialCalendar: SocialCalendarItem[] }>(SOCIAL_CALENDAR, {
    variables: gridRange(weeks),
    fetchPolicy: 'cache-and-network',
  });

  const byDay = useMemo(() => {
    const days = new Map<string, SocialCalendarItem[]>();
    const items = [...(data?.socialCalendar ?? [])];
    items.sort((a, b) => a.at.localeCompare(b.at));
    for (const item of items) {
      const key = dayKey(item.at);
      days.set(key, [...(days.get(key) ?? []), item]);
    }
    return days;
  }, [data, dayKey]);

  // A week's row always starts on its Monday, so the first key of the first row names the week.
  const titles: Record<CalendarUnit, () => string> = {
    MONTH: () => monthTitle(month),
    WEEK: () => t('marketing.social.weekOf', { vars: { date: formatDay(weeks[0][0]) } }),
    DAY: () => formatDay(anchor),
  };
  const title = titles[unit]();
  const add = (day: string) => onAdd(day, today);
  // The month's padding days belong to the neighbouring months; a week or a day is all its own.
  const agendaDays = unit === 'MONTH' ? weeks.flat().filter((day) => day.startsWith(month)) : weeks.flat();
  const agenda = <CalendarAgenda days={agendaDays} byDay={byDay} onOpen={onOpen} emptyText={t(AGENDA_EMPTY[unit])} />;

  const body = () => {
    if (unit === 'DAY') {
      return (
        <Stack spacing={1.5} data-testid="social-calendar-day">
          {anchor >= today && (
            <Box>
              <DuncitButton size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => add(anchor)} data-testid={`social-calendar-add-${anchor}`}>
                {t('marketing.social.addPostOn', { vars: { day: dayTitle(anchor) } })}
              </DuncitButton>
            </Box>
          )}
          {agenda}
        </Stack>
      );
    }
    if (phone) return agenda;
    return (
      <CalendarTable
        title={title}
        weeks={weeks}
        month={unit === 'MONTH' ? month : undefined}
        today={today}
        byDay={byDay}
        onAdd={add}
        onOpen={onOpen}
      />
    );
  };

  return (
    <Stack spacing={1.5} data-testid="social-calendar">
      <CalendarHeader
        unit={unit}
        title={title}
        onUnit={setUnit}
        onStep={(by) => setAnchor(shift(unit, anchor, by))}
        onToday={() => setAnchor(today)}
      />
      {loading && !data && <LinearProgress />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {body()}
    </Stack>
  );
}
