import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps } from '@duncit/tabs';
import { QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { EventList } from '../../components/events/EventList';
import { useUpcomingPastTabs } from '../../components/useUpcomingPastTabs';
import { LITE_CALENDAR, LITE_CALENDAR_EVENTS } from '../../graphql/calendars';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { CalendarHeader } from './CalendarHeader';

const TABS_ID = 'calendar';

function CalendarEvents({ slug, past }: Readonly<{ slug: string; past: boolean }>) {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_CALENDAR_EVENTS, { variables: { slug, past }, fetchPolicy: 'cache-and-network' });
  return (
    <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
      <EventList events={data?.liteCalendarEvents ?? []} emptyTitle={past ? t('liteWeb.events.noPast') : t('liteWeb.events.noUpcoming')} />
    </QueryGuard>
  );
}

/** /cal/:slug — a calendar's public page: who runs it, subscribe, and its events. */
export function CalendarPage() {
  const { t } = useWebT();
  const { slug = '' } = useParams();
  const tabs = useUpcomingPastTabs();
  const { data, loading, error, refetch } = useQuery(LITE_CALENDAR, { variables: { slug }, fetchPolicy: 'cache-and-network' });
  const calendar = data?.liteCalendar ?? null;
  usePageTitle(calendar?.name ?? '', calendar?.description ?? undefined);
  if (!loading && !error && !calendar) return <NotFoundPage />;
  const reload = () => {
    refetch().catch(() => undefined);
  };
  return (
    <QueryGuard loading={loading && !calendar} error={error} loadingLabel={t('lite.common.loading')}>
      {() =>
        calendar ? (
          <Stack spacing={3} data-testid="calendar-page">
            <CalendarHeader calendar={calendar} onChanged={reload} />
            <DuncitTabs {...tabs} idPrefix={TABS_ID} />
            <Box {...tabPanelProps(TABS_ID, tabs.value)}>
              <CalendarEvents slug={calendar.slug} past={tabs.past} />
            </Box>
          </Stack>
        ) : null
      }
    </QueryGuard>
  );
}
