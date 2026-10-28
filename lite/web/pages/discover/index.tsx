import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { SearchForm } from '../../components/search-form';
import { LITE_DISCOVER } from '../../graphql/discover';
import { usePageTitle } from '../../lib/usePageTitle';
import { CitySelect } from './CitySelect';
import { DiscoverSections } from './DiscoverSections';
import { DiscoverSkeleton } from './DiscoverSkeleton';

export { CalendarCard } from './CalendarCard';
export { CategoryGrid } from './CategoryGrid';
export { DiscoverSection } from './DiscoverSection';

/** /discover — search, then popular events (with the city picker), categories, featured calendars and local events by region. */
export function DiscoverPage() {
  const { t } = useWebT();
  const [params, setParams] = useSearchParams();
  const citySlug = params.get('city') ?? '';
  const { data, previousData, loading, error } = useQuery(LITE_DISCOVER, { variables: { city_slug: citySlug || null }, fetchPolicy: 'cache-and-network' });
  // The last city's Discover stays up while the next one loads, so the picker (inside it) never blinks out.
  const discover = (data ?? previousData)?.liteDiscover;
  const city = discover?.cities.find((c) => c.slug === citySlug) ?? null;
  usePageTitle(t('liteWeb.discover.title'), t('liteWeb.discover.subtitle'));

  const pickCity = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('city', slug);
    else next.delete('city');
    setParams(next, { replace: true });
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }} data-testid="discover-page">
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="h2" component="h1">
            {t('liteWeb.discover.title')}
          </Typography>
          <Typography color="text.secondary">{t('liteWeb.discover.subtitle')}</Typography>
        </Stack>
        <SearchForm citySlug={citySlug || null} />
        <QueryGuard loading={loading && !discover} error={error} skeleton={<DiscoverSkeleton />}>
          {() =>
            discover ? (
              <DiscoverSections
                discover={discover}
                cityName={city?.name ?? null}
                citySlug={city?.slug ?? null}
                cityPicker={<CitySelect cities={discover.cities} value={citySlug} onChange={pickCity} />}
              />
            ) : null
          }
        </QueryGuard>
      </Stack>
    </Box>
  );
}
