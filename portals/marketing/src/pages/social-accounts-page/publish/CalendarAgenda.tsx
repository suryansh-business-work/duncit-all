import { Alert, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { SocialCalendarItem } from '../publish.queries';
import CalendarItemButton from './CalendarItemButton';
import { dayTitle } from './calendar-grid';

interface Props {
  days: string[];
  byDay: Map<string, SocialCalendarItem[]>;
  onOpen: (item: SocialCalendarItem) => void;
}

/** The month on a phone: seven columns do not fit, so it reads as a list of the days that have posts. */
export default function CalendarAgenda({ days, byDay, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const busy = days.filter((day) => (byDay.get(day) ?? []).length > 0);
  if (busy.length === 0) {
    return (
      <Alert severity="info" variant="outlined">
        {t('marketing.social.calendarEmpty')}
      </Alert>
    );
  }
  return (
    <Stack spacing={2} data-testid="social-calendar-agenda">
      {busy.map((day) => (
        <Stack key={day} spacing={0.75}>
          <Typography variant="subtitle2" component="h3">
            {dayTitle(day)}
          </Typography>
          {(byDay.get(day) ?? []).map((item) => (
            <CalendarItemButton key={`${item.kind}-${item.id}`} item={item} onOpen={onOpen} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
