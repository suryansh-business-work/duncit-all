import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import type { LiteCalendar } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { EmptyState } from '../../components/EmptyState';
import { SignedInGate } from '../../components/SignedInGate';
import { UserAvatar } from '../../components/UserAvatar';
import { LITE_MY_CALENDARS } from '../../graphql/calendars';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';

export { CalendarFormPage } from './CalendarFormPage';

function MyCalendarCard({ calendar }: Readonly<{ calendar: LiteCalendar }>) {
  const { t } = useWebT();
  return (
    <Card component="li" data-testid="my-calendar-card">
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <UserAvatar name={calendar.name} url={calendar.avatar_url} size={48} />
          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h2" noWrap>
              {calendar.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('liteWeb.discover.upcomingCount', { count: calendar.upcoming_count })} · {t('liteWeb.discover.subscribers', { count: calendar.subscriber_count })}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ pt: 2, flexWrap: 'wrap' }}>
          <DuncitButton component={RouterLink} to={paths.calendar(calendar.slug)} variant="outlined" size="small" data-testid="my-calendar-view">
            {t('liteWeb.calendars.view')}
          </DuncitButton>
          <DuncitButton component={RouterLink} to={paths.calendarEdit(calendar.id)} variant="text" size="small" data-testid="my-calendar-edit">
            {t('lite.common.edit')}
          </DuncitButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

function MyCalendars() {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_MY_CALENDARS, { fetchPolicy: 'cache-and-network' });
  const rows = data?.liteMyCalendars ?? [];
  return (
    <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarMonthOutlinedIcon />}
          title={t('liteWeb.calendars.empty')}
          body={t('liteWeb.calendars.emptyBody')}
          action={
            <DuncitButton component={RouterLink} to={paths.calendarNew} variant="contained" startIcon={<AddIcon />} data-testid="calendars-new-empty">
              {t('liteWeb.calendars.new')}
            </DuncitButton>
          }
        />
      ) : (
        <Box component="ul" sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, listStyle: 'none', p: 0, m: 0 }} data-testid="my-calendars">
          {rows.map((calendar) => (
            <MyCalendarCard key={calendar.id} calendar={calendar} />
          ))}
        </Box>
      )}
    </QueryGuard>
  );
}

/** /calendars — the calendars the reader owns. */
export function CalendarsPage() {
  const { t } = useWebT();
  usePageTitle(t('liteWeb.calendars.title'));
  return (
    <Stack spacing={2} data-testid="calendars-page">
      <PageHeader
        title={t('liteWeb.calendars.title')}
        subtitle={t('liteWeb.calendars.subtitle')}
        titleVariant="h4"
        actions={
          <DuncitButton component={RouterLink} to={paths.calendarNew} variant="contained" startIcon={<AddIcon />} data-testid="calendars-new">
            {t('liteWeb.calendars.new')}
          </DuncitButton>
        }
      />
      <SignedInGate body={t('liteWeb.calendars.gate')}>
        <MyCalendars />
      </SignedInGate>
    </Stack>
  );
}
