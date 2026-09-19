import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { SearchForm } from '../../components/search-form';
import { LITE_DISCOVER } from '../../graphql/discover';
import { usePageTitle } from '../../lib/usePageTitle';
import { CitySelect } from './CitySelect';
import { DiscoverSections } from './DiscoverSections';

/** / and /discover — categories, featured calendars, cities, popular and upcoming events. */
export function DiscoverPage() {
  const { t } = useWebT();
  const [params, setParams] = useSearchParams();
  const citySlug = params.get('city') ?? '';
  const { data, loading, error } = useQuery(LITE_DISCOVER, { variables: { city_slug: citySlug || null }, fetchPolicy: 'cache-and-network' });
  const discover = data?.liteDiscover;
  usePageTitle(t('liteWeb.discover.title'), t('liteWeb.discover.subtitle'));

  const pickCity = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('city', slug);
    else next.delete('city');
    setParams(next, { replace: true });
  };

  return (
    <Stack spacing={4} data-testid="discover-page">
      <PageHeader title={t('liteWeb.discover.title')} subtitle={t('liteWeb.discover.subtitle')} titleVariant="h4" />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-start' } }}>
        <Box sx={{ flexGrow: 1 }}>
          <SearchForm citySlug={citySlug || null} />
        </Box>
        <CitySelect cities={discover?.cities ?? []} value={citySlug} onChange={pickCity} />
      </Stack>
      <QueryGuard loading={loading && !discover} error={error} loadingLabel={t('lite.common.loading')}>
        {() => (discover ? <DiscoverSections discover={discover} cityPicked={Boolean(citySlug)} /> : null)}
      </QueryGuard>
    </Stack>
  );
}
