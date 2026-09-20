import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, LinearProgress, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { SOCIAL_CALENDAR, type SocialCalendarItem } from '../publish.queries';
import CalendarDayCell from './CalendarDayCell';
import CalendarAgenda from './CalendarAgenda';
import { gridRange, monthTitle, monthWeeks, shiftMonth, weekdayNames } from './calendar-grid';

interface Props {
  /** A day's "+" was pressed: start a post dated that day. */
  onAdd: (day: string, today: string) => void;
  onOpen: (item: SocialCalendarItem) => void;
}

/**
 * The content calendar: every post written here and every post read back from
 * the networks, on the day it went (or goes) out, in the admin's time zone.
 */
export default function CalendarView({ onAdd, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { dayKey, now } = useDateFormat({ timeZoneAware: true });
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const today = dayKey(now());
  const [month, setMonth] = useState(today.slice(0, 7));
  const weeks = useMemo(() => monthWeeks(month), [month]);
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

  const title = monthTitle(month);
  const add = (day: string) => onAdd(day, today);

  return (
    <Stack spacing={1.5} data-testid="social-calendar">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Tooltip title={t('marketing.social.previousMonth')}>
          <DuncitIconButton onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeftIcon />
          </DuncitIconButton>
        </Tooltip>
        <Typography variant="h6" component="h2" sx={{ minWidth: 170, textAlign: 'center' }} aria-live="polite">
          {title}
        </Typography>
        <Tooltip title={t('marketing.social.nextMonth')}>
          <DuncitIconButton onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRightIcon />
          </DuncitIconButton>
        </Tooltip>
        <DuncitButton size="small" variant="outlined" onClick={() => setMonth(today.slice(0, 7))}>
          {t('marketing.social.today')}
        </DuncitButton>
      </Stack>
      {loading && !data && <LinearProgress />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {/* On a wide screen a table, not an ARIA grid: the days hold buttons, and a grid would promise arrow-key moves it does not have. */}
      {phone ? (
        <CalendarAgenda days={weeks.flat().filter((day) => day.startsWith(month))} byDay={byDay} onOpen={onOpen} />
      ) : (
        <Box role="table" aria-label={title} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <Box role="row" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', bgcolor: 'action.hover' }}>
            {weekdayNames(weeks[0] ?? []).map((name) => (
              <Typography key={name} component="div" role="columnheader" variant="caption" sx={{ p: 0.75, fontWeight: 600, textAlign: 'center' }}>
                {name}
              </Typography>
            ))}
          </Box>
          {weeks.map((week) => (
            <Box key={week[0]} role="row" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
              {week.map((day) => (
                <CalendarDayCell
                  key={day}
                  day={day}
                  today={today}
                  inMonth={day.startsWith(month)}
                  items={byDay.get(day) ?? []}
                  onAdd={add}
                  onOpen={onOpen}
                />
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  );
}
