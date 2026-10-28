import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, CardActionArea, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DuncitButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import type { LiteCalendar } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { EmptyState } from '../../components/EmptyState';
import { UserAvatar } from '../../components/UserAvatar';
import { LITE_MY_CALENDARS } from '../../graphql/calendars';
import { paths } from '../../lib/paths';
import { DiscoverSection } from '../discover/DiscoverSection';

export const CALENDAR_GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, listStyle: 'none', p: 0, m: 0 } as const;

/** One of the reader's calendars: opens its page, with Edit beside it (not inside the link). */
function MyCalendarCard({ calendar }: Readonly<{ calendar: LiteCalendar }>) {
  const { t } = useWebT();
  return (
    <Card component="li" sx={{ position: 'relative', height: '100%' }} data-testid="my-calendar-card">
      <CardActionArea component={RouterLink} to={paths.calendar(calendar.slug)} sx={{ p: 2, height: '100%', alignItems: 'flex-start' }} data-testid="my-calendar-view">
        <Stack spacing={1.5}>
          <UserAvatar name={calendar.name} url={calendar.avatar_url} size={48} square />
          <Stack spacing={0.25} sx={{ minWidth: 0, pr: 4 }}>
            <Typography variant="body1" component="h3" sx={{ fontWeight: 700 }} noWrap>
              {calendar.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('liteWeb.discover.subscribers', { count: calendar.subscriber_count })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('liteWeb.discover.upcomingCount', { count: calendar.upcoming_count })}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
      <IconButton
        component={RouterLink}
        to={paths.calendarEdit(calendar.id)}
        aria-label={t('liteWeb.calendars.editNamed', { vars: { name: calendar.name } })}
        size="small"
        sx={{ position: 'absolute', top: 8, right: 8 }}
        data-testid="my-calendar-edit"
      >
        <EditOutlinedIcon fontSize="small" />
      </IconButton>
    </Card>
  );
}

/** "My calendars": every calendar the reader owns, with Create. */
export function MyCalendars() {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_MY_CALENDARS, { fetchPolicy: 'cache-and-network' });
  const rows = data?.liteMyCalendars ?? [];
  const create = (
    <DuncitButton component={RouterLink} to={paths.calendarNew} variant="outlined" size="small" startIcon={<AddIcon />} data-testid="calendars-new">
      {t('liteWeb.calendars.create')}
    </DuncitButton>
  );
  return (
    <DiscoverSection title={t('liteWeb.calendars.title')} subtitle={t('liteWeb.calendars.subtitle')} action={create} testId="my-calendars-section">
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        {rows.length === 0 ? (
          <EmptyState icon={<CalendarMonthOutlinedIcon />} title={t('liteWeb.calendars.empty')} body={t('liteWeb.calendars.emptyBody')} testId="my-calendars-empty" />
        ) : (
          <Box component="ul" sx={CALENDAR_GRID} data-testid="my-calendars">
            {rows.map((calendar) => (
              <MyCalendarCard key={calendar.id} calendar={calendar} />
            ))}
          </Box>
        )}
      </QueryGuard>
    </DiscoverSection>
  );
}
