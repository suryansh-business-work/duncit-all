import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Container } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../shared/i18n';
import { LITE_DISCOVER } from '../../graphql/discover';
import { usePageTitle } from '../../lib/usePageTitle';
import { ClosingCall } from './ClosingCall';
import { Hero } from './Hero';
import { LandingSections } from './LandingSections';

/**
 * lite.duncit.com for a visitor: the hero over real event covers, then what is
 * happening (popular, major events, communities, categories). One Discover
 * read feeds it all, and the server renders it, so a crawler sees the page.
 */
export function LandingPage() {
  const { t } = useWebT();
  const [params] = useSearchParams();
  const citySlug = params.get('city');
  const { data, error } = useQuery(LITE_DISCOVER, { variables: { city_slug: citySlug }, fetchPolicy: 'cache-and-network' });
  const discover = data?.liteDiscover;
  usePageTitle(t('liteWeb.landing.pageTitle'), t('liteWeb.landing.body'));
  const covers = useMemo(() => {
    const events = [...(discover?.featured_events ?? []), ...(discover?.popular_events ?? []), ...(discover?.upcoming_events ?? [])];
    return [...new Set(events.map((event) => event.cover_url).filter((url): url is string => Boolean(url)))];
  }, [discover]);
  const cityName = discover?.cities.find((city) => city.slug === citySlug)?.name ?? null;
  return (
    <div data-testid="landing-page">
      <Hero covers={covers} />
      <Container maxWidth={false} sx={{ maxWidth: 1040 }}>
        {error ? (
          <Alert severity="error" role="alert" data-testid="landing-error">
            {parseApiError(error, t('lite.common.loadFailed'))}
          </Alert>
        ) : null}
        {discover ? <LandingSections discover={discover} cityName={cityName} /> : null}
        <ClosingCall />
      </Container>
    </div>
  );
}
