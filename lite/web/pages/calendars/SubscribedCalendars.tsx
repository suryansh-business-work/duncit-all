import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box } from '@mui/material';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import { DuncitButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { EmptyState } from '../../components/EmptyState';
import { LITE_SUBSCRIBED_CALENDARS } from '../../graphql/calendars';
import { paths } from '../../lib/paths';
import { CalendarCard } from '../discover/CalendarCard';
import { DiscoverSection } from '../discover/DiscoverSection';
import { CALENDAR_GRID } from './MyCalendars';
import { CalendarCardsSkeleton } from './CalendarsSkeletons';

/** "Subscribed calendars": the ones the reader follows, each with Following to stop. */
export function SubscribedCalendars() {
  const { t } = useWebT();
  const { data, loading, error } = useQuery(LITE_SUBSCRIBED_CALENDARS, { fetchPolicy: 'cache-and-network' });
  const rows = data?.liteSubscribedCalendars ?? [];
  return (
    <DiscoverSection title={t('liteWeb.calendars.subscribedTitle')} testId="subscribed-calendars-section">
      <QueryGuard loading={loading && !data} error={error} skeleton={<CalendarCardsSkeleton testId="subscribed-calendars-skeleton" />}>
        {rows.length === 0 ? (
          <EmptyState
            icon={<ExploreOutlinedIcon />}
            title={t('liteWeb.calendars.subscribedEmpty')}
            body={t('liteWeb.calendars.subscribedEmptyBody')}
            action={
              <DuncitButton component={RouterLink} to={paths.discover} variant="outlined" data-testid="subscribed-calendars-discover">
                {t('liteWeb.calendars.browse')}
              </DuncitButton>
            }
            testId="subscribed-calendars-empty"
          />
        ) : (
          <Box component="ul" sx={CALENDAR_GRID} data-testid="subscribed-calendars">
            {rows.map((calendar) => (
              <Box component="li" key={calendar.id}>
                <CalendarCard calendar={calendar} followable />
              </Box>
            ))}
          </Box>
        )}
      </QueryGuard>
    </DiscoverSection>
  );
}
