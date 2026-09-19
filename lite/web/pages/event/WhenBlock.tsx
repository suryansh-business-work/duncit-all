import { useId, useState } from 'react';
import { Menu, MenuItem, Stack, Typography } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { DuncitButton } from '@duncit/buttons';
import { eventWhen } from '../../../shared/format';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { googleCalendarUrl } from '../../lib/calendarLinks';
import { paths } from '../../lib/paths';

/** Date, time and zone as the host set them, with "Add to calendar" (Google, or the .ics file). */
export function WhenBlock({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const when = eventWhen(event.start_at, event.end_at, event.timezone);
  const close = () => setAnchor(null);
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }} data-testid="event-when">
      <CalendarMonthOutlinedIcon sx={{ color: 'primary.main', mt: 0.5 }} aria-hidden />
      <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
        <Typography component="h2" variant="h5">
          {when.date}
        </Typography>
        <Typography color="text.secondary">
          {when.time} ({when.zone})
        </Typography>
        <Stack direction="row" sx={{ pt: 0.5 }}>
          <DuncitButton
            size="small"
            variant="text"
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            aria-controls={anchor ? menuId : undefined}
            onClick={(clickEvent) => setAnchor(clickEvent.currentTarget)}
            data-testid="add-to-calendar"
          >
            {t('liteWeb.event.addToCalendar')}
          </DuncitButton>
          <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
            <MenuItem
              component="a"
              href={googleCalendarUrl(event, t('lite.common.online'))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              data-testid="add-to-calendar-google"
            >
              {t('liteWeb.event.googleCalendar')}
            </MenuItem>
            <MenuItem component="a" href={paths.ics.event(event.slug)} onClick={close} data-testid="add-to-calendar-ics">
              {t('liteWeb.event.icsFile')}
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>
    </Stack>
  );
}
