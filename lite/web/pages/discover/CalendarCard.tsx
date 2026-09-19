import { Link as RouterLink } from 'react-router';
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import type { LiteCalendar } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { tintAt } from '../../../shared/theme';
import { LiteImage } from '../../components/LiteImage';
import { UserAvatar } from '../../components/UserAvatar';
import { paths } from '../../lib/paths';

interface CalendarCardProps {
  calendar: LiteCalendar;
  /** Position in the grid, for the rotating tint behind a missing cover. */
  position: number;
}

/** A calendar in a grid: cover, avatar, name, how many events and subscribers. */
export function CalendarCard({ calendar, position }: Readonly<CalendarCardProps>) {
  const { t } = useWebT();
  return (
    <Card sx={{ height: '100%' }} data-testid="calendar-card">
      <CardActionArea component={RouterLink} to={paths.calendar(calendar.slug)} sx={{ height: '100%' }}>
        <Box sx={{ bgcolor: tintAt(position) }}>
          {calendar.cover_url ? <LiteImage src={calendar.cover_url} alt="" width={640} height={240} /> : <Box sx={{ aspectRatio: '640 / 240' }} />}
        </Box>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <UserAvatar name={calendar.name} url={calendar.avatar_url} size={44} />
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="h3" noWrap>
                {calendar.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {t('liteWeb.discover.upcomingCount', { count: calendar.upcoming_count })} · {t('liteWeb.discover.subscribers', { count: calendar.subscriber_count })}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
