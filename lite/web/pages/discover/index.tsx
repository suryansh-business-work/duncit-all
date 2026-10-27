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

export { CalendarCard } from './CalendarCard';
export { CategoryGrid } from './CategoryGrid';
export { DiscoverSection } from './DiscoverSection';

/** /discover — popular events (by city), categories, featured calendars and local events by region. */
export function DiscoverPage() {
  const { t } = useWebT();
  const [params, setParams] = useSearchParams();
  const citySlug = params.get('city') ?? '';
  const { data, loading, error } = useQuery(LITE_DISCOVER, { variables: { city_slug: citySlug || null }, fetchPolicy: 'cache-and-network' });
  const discover = data?.liteDiscover;
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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
          <Box sx={{ flexGrow: 1 }}>
            <SearchForm citySlug={citySlug || null} />
          </Box>
          <CitySelect cities={discover?.cities ?? []} value={citySlug} onChange={pickCity} />
        </Stack>
        <QueryGuard loading={loading && !discover} error={error} loadingLabel={t('lite.common.loading')}>
          {() => (discover ? <DiscoverSections discover={discover} cityName={city?.name ?? null} citySlug={city?.slug ?? null} /> : null)}
        </QueryGuard>
      </Stack>
    </Box>
  );
}
