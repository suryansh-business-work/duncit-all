import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Divider, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { EmptyState } from '../../components/EmptyState';
import { EventRow } from '../../components/events/EventRow';
import type { LiteDiscover } from '../../graphql/discover';
import { paths } from '../../lib/paths';
import { CalendarCard } from './CalendarCard';
import { CategoryGrid } from './CategoryGrid';
import { CityRegions } from './CityRegions';
import { DiscoverSection } from './DiscoverSection';

export const TWO_COLUMNS = { display: 'grid', columnGap: 4, rowGap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } } as const;
export const THREE_COLUMNS = { display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } } as const;

interface DiscoverSectionsProps {
  discover: LiteDiscover;
  /** The picked city's name, for "Popular events in …"; null means everywhere. */
  cityName: string | null;
  citySlug: string | null;
  /** The city picker, drawn beside View all in the "Popular events" header. */
  cityPicker?: ReactNode;
}

/** The bands of Discover, each shown only when it has something to show. */
export function DiscoverSections({ discover, cityName, citySlug, cityPicker }: Readonly<DiscoverSectionsProps>) {
  const { t } = useWebT();
  const { categories, cities, featured_calendars: calendars, popular_events: popular } = discover;
  if (categories.length + cities.length + calendars.length + popular.length === 0) {
    return <EmptyState icon={<EventBusyOutlinedIcon />} title={t('liteWeb.discover.empty')} body={t('liteWeb.discover.emptyBody')} />;
  }
  const viewAll = (
    <DuncitButton component={RouterLink} to={citySlug ? paths.city(citySlug) : paths.search('')} size="small" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: LITE_RADII.pill }} data-testid="discover-view-all">
      {t('liteWeb.discover.viewAll')}
    </DuncitButton>
  );
  const actions = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {cityPicker}
      {viewAll}
    </Stack>
  );
  return (
    <Stack spacing={4} divider={<Divider flexItem />}>
      {/* Kept while a city is picked, even with nothing popular there, so the picker stays in reach. */}
      {popular.length > 0 || citySlug ? (
        <DiscoverSection title={t('liteWeb.discover.popular')} subtitle={cityName ?? t('liteWeb.discover.everywhere')} action={actions} testId="discover-popular">
          {popular.length > 0 ? (
            <Box sx={TWO_COLUMNS}>
              {popular.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary" data-testid="discover-popular-empty">
              {t('liteWeb.discover.popularEmpty')}
            </Typography>
          )}
        </DiscoverSection>
      ) : null}
      {categories.length > 0 ? (
        <DiscoverSection title={t('liteWeb.discover.categories')} testId="discover-categories">
          <CategoryGrid categories={categories} />
        </DiscoverSection>
      ) : null}
      {calendars.length > 0 ? (
        <DiscoverSection title={t('liteWeb.discover.featuredCalendars')} testId="discover-calendars">
          <Box sx={THREE_COLUMNS}>
            {calendars.map((calendar) => (
              <CalendarCard key={calendar.id} calendar={calendar} followable />
            ))}
          </Box>
        </DiscoverSection>
      ) : null}
      {cities.length > 0 ? (
        <DiscoverSection title={t('liteWeb.discover.exploreCities')} testId="discover-cities">
          <CityRegions cities={cities} />
        </DiscoverSection>
      ) : null}
    </Stack>
  );
}
