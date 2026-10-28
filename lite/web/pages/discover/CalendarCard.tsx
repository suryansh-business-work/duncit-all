import { Link as RouterLink } from 'react-router';
import { Card, CardActionArea, Stack, Typography } from '@mui/material';
import type { LiteCalendar } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { UserAvatar } from '../../components/UserAvatar';
import { paths } from '../../lib/paths';
import { FollowButton } from './FollowButton';

interface CalendarCardProps {
  calendar: LiteCalendar;
  /** Show Follow beside the avatar (Discover) — the landing page keeps cards quiet. */
  followable?: boolean;
}

/** A community: its avatar, name and a two-line description, with Follow where it applies. */
export function CalendarCard({ calendar, followable = false }: Readonly<CalendarCardProps>) {
  const { t } = useWebT();
  return (
    <Card sx={{ height: '100%', position: 'relative' }} data-testid="calendar-card">
      <CardActionArea component={RouterLink} to={paths.calendar(calendar.slug)} sx={{ p: 1.75, height: '100%', alignItems: 'flex-start' }}>
        <Stack spacing={1.25}>
          <UserAvatar name={calendar.name} url={calendar.avatar_url} size={40} square />
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="body1" component="h3" sx={{ fontWeight: 700 }} noWrap>
              {calendar.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {calendar.description || t('liteWeb.discover.upcomingCount', { count: calendar.upcoming_count })}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
      {followable && !calendar.viewer_is_owner ? <FollowButton calendar={calendar} sx={{ position: 'absolute', top: 12, right: 12 }} /> : null}
    </Card>
  );
}
