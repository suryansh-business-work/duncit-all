import { Box, Stack } from '@mui/material';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { useWebT } from '../../../shared/i18n';
import { EmptyState } from '../../components/EmptyState';
import { EventCard } from '../../components/events/EventCard';
import { EventList } from '../../components/events/EventList';
import type { LiteDiscover } from '../../graphql/discover';
import { CalendarCard } from './CalendarCard';
import { CategoryChips } from './CategoryChips';
import { CityCard } from './CityCard';
import { DiscoverSection } from './DiscoverSection';

const GRID_3 = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } } as const;
const GRID_4 = { display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } } as const;

/** The bands of Discover, each shown only when it has something to show. */
export function DiscoverSections({ discover, cityPicked }: Readonly<{ discover: LiteDiscover; cityPicked: boolean }>) {
  const { t } = useWebT();
  const { categories, cities, featured_calendars: calendars, popular_events: popular, upcoming_events: upcoming } = discover;
  const nothing = categories.length === 0 && cities.length === 0 && calendars.length === 0 && popular.length === 0 && upcoming.length === 0;
  if (nothing) return <EmptyState icon={<EventBusyOutlinedIcon />} title={t('liteWeb.discover.empty')} body={t('liteWeb.discover.emptyBody')} />;
  return (
    <Stack spacing={5}>
      {categories.length > 0 ? (
        <DiscoverSection title={t('liteWeb.discover.categories')} testId="discover-categories">
          <CategoryChips categories={categories} />
        </DiscoverSection>
      ) : null}
      {calendars.length > 0 ? (
        <DiscoverSection title={t('liteWeb.discover.featuredCalendars')} testId="discover-calendars">
          <Box sx={GRID_3}>
            {calendars.map((calendar, index) => (
              <CalendarCard key={calendar.id} calendar={calendar} position={index} />
            ))}
          </Box>
        </DiscoverSection>
      ) : null}
      {cities.length > 0 && !cityPicked ? (
        <DiscoverSection title={t('liteWeb.discover.exploreCities')} testId="discover-cities">
          <Box sx={GRID_4}>
            {cities.map((city, index) => (
              <CityCard key={city.id} city={city} position={index} />
            ))}
          </Box>
        </DiscoverSection>
      ) : null}
      {popular.length > 0 ? (
        <DiscoverSection title={t('liteWeb.discover.popular')} testId="discover-popular">
          <Box sx={GRID_3}>
            {popular.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </Box>
        </DiscoverSection>
      ) : null}
      <DiscoverSection title={t('liteWeb.discover.upcoming')} testId="discover-upcoming">
        <EventList events={upcoming} emptyTitle={t('liteWeb.discover.noUpcoming')} emptyBody={t('liteWeb.events.emptyBody')} />
      </DiscoverSection>
    </Stack>
  );
}
