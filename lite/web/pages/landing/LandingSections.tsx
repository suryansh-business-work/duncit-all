import { Box, Stack } from '@mui/material';
import { useWebT } from '../../../shared/i18n';
import { EventPill } from '../../components/events/EventPill';
import { EventTile } from '../../components/events/EventTile';
import type { LiteDiscover } from '../../graphql/discover';
import { CalendarCard } from '../discover/CalendarCard';
import { CategoryGrid } from '../discover/CategoryGrid';
import { DiscoverSection } from '../discover/DiscoverSection';
import { Reveal } from '../../components/Reveal';

const TILES = { display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' } } as const;
const FOUR = { display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } } as const;

/** Popular events, the major events, communities and categories — each only when it has something. */
export function LandingSections({ discover, cityName }: Readonly<{ discover: LiteDiscover; cityName: string | null }>) {
  const { t } = useWebT();
  const popular = discover.popular_events.slice(0, 5);
  const major = discover.featured_events.slice(0, 8);
  const calendars = discover.featured_calendars.slice(0, 8);
  return (
    <Stack spacing={7}>
      {popular.length > 0 ? (
        <Reveal>
          <DiscoverSection title={cityName ? t('liteWeb.landing.popularIn', { vars: { city: cityName } }) : t('liteWeb.discover.popular')} testId="landing-popular">
            <Box sx={TILES}>
              {popular.map((event) => (
                <EventTile key={event.id} event={event} />
              ))}
            </Box>
          </DiscoverSection>
        </Reveal>
      ) : null}
      {major.length > 0 ? (
        <Reveal>
          <DiscoverSection title={t('liteWeb.landing.major')} testId="landing-major">
            <Box sx={FOUR}>
              {major.map((event) => (
                <EventPill key={event.id} event={event} />
              ))}
            </Box>
          </DiscoverSection>
        </Reveal>
      ) : null}
      {calendars.length > 0 ? (
        <Reveal>
          <DiscoverSection title={t('liteWeb.landing.communities')} testId="landing-communities">
            <Box sx={FOUR}>
              {calendars.map((calendar) => (
                <CalendarCard key={calendar.id} calendar={calendar} />
              ))}
            </Box>
          </DiscoverSection>
        </Reveal>
      ) : null}
      {discover.categories.length > 0 ? (
        <Reveal>
          <DiscoverSection title={t('liteWeb.discover.categories')} testId="landing-categories">
            <CategoryGrid categories={discover.categories} showCounts={false} />
          </DiscoverSection>
        </Reveal>
      ) : null}
    </Stack>
  );
}
