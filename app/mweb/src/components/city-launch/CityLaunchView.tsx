import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import PageHeader from '../PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import CityLaunchAdded from './CityLaunchAdded';
import CityLaunchHero from './CityLaunchHero';
import CityLaunchNotify from './CityLaunchNotify';
import CityLaunchWhatElse from './CityLaunchWhatElse';
import { LOCATION_LAUNCH_STATUS, type CityLaunchStatus } from './queries';

interface Props {
  /** The Location's id (GraphQL `Location.id`). */
  locationId: string;
  /** Draws the round back button and the city's name above the page — the
   * standalone /city-launch route. Home shows the view without it. */
  onBack?: () => void;
}

/**
 * The waitlist a city that has not launched yet shows in place of the feed:
 * the live count and the way to the launch goal, then either the button that
 * adds your name or what to do once it is added, then the other ways to help.
 * Native twin: components/city-launch/CityLaunchView.
 */
export default function CityLaunchView({ locationId, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  // Network on every mount: the count is the page's whole point, so a cached
  // answer is shown only until the fresh one lands.
  const { data, loading, error } = useQuery<{ locationLaunchStatus: CityLaunchStatus | null }>(
    LOCATION_LAUNCH_STATUS,
    { variables: { locationId }, fetchPolicy: 'cache-and-network', skip: !locationId },
  );
  const status = data?.locationLaunchStatus;
  const city = status?.location.location_name ?? '';

  let body;
  if (status) {
    body = (
      <>
        <CityLaunchHero status={status} city={city} />
        {status.is_subscribed ? (
          <CityLaunchAdded locationId={locationId} city={city} whatsappGroupUrl={status.location.whatsapp_group_url} />
        ) : (
          <CityLaunchNotify locationId={locationId} city={city} />
        )}
        <CityLaunchWhatElse />
      </>
    );
  } else if (loading) {
    body = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} />
      </Box>
    );
  } else if (error) {
    body = (
      <Alert data-testid="city-launch-error" severity="error">
        {parseApiError(error)}
      </Alert>
    );
  } else {
    body = (
      <Typography data-testid="city-launch-not-found" sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
        {t('mweb.cityLaunch.notFound')}
      </Typography>
    );
  }

  return (
    <Stack data-testid="city-launch-view" spacing={3} sx={{ minWidth: 0 }}>
      {onBack ? <PageHeader testId="city-launch-header" title={city} onBack={onBack} /> : null}
      {body}
    </Stack>
  );
}
