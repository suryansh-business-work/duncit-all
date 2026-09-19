import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { LAUNCH_ROLE_SECTIONS, parseApiError } from '@duncit/utils';
import { useEntityPageMeta } from '../../app/pageMeta';
import PageHeader from '../PageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import CityLaunchHero from './CityLaunchHero';
import CityLaunchRoleSection from './CityLaunchRoleSection';
import { LOCATION_LAUNCH_STATUS, type CityLaunchStatus } from './queries';
import { useLaunchViewportHeight } from './useLaunchViewportHeight';

interface Props {
  /** The city's slug from a shared link, or its `Location.id` (Home, older links)
   * — the server resolves either. */
  locationId: string;
  /** Draws the round back button and the city's name over the first screen —
   * the standalone /city-launch route. Home shows the view without it. */
  onBack?: () => void;
}

/**
 * The waitlist a city that has not launched yet shows in place of the feed:
 * four full-height screens, each over its admin-set video — the live count
 * and the way to the launch goal with the button that adds your name, then
 * one screen each for hosting, a venue and running a club. Native twin:
 * components/city-launch/CityLaunchView.
 */
export default function CityLaunchView({ locationId, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const minHeight = useLaunchViewportHeight();
  // Network on every mount: the count is the page's whole point, so a cached
  // answer is shown only until the fresh one lands.
  const { data, loading, error } = useQuery<{ locationLaunchStatus: CityLaunchStatus | null }>(
    LOCATION_LAUNCH_STATUS,
    { variables: { locationId }, fetchPolicy: 'cache-and-network', skip: !locationId },
  );
  const status = data?.locationLaunchStatus;
  const city = status?.location.location_name ?? '';
  // The standalone page names the tab exactly as the server named the shared
  // link; inline on Home the tab stays Home's.
  useEntityPageMeta(onBack && city ? t('mweb.meta.cityLaunch.title', { vars: { name: city } }) : null);
  const header = onBack ? <PageHeader testId="city-launch-header" title={city} onBack={onBack} /> : null;

  if (status) {
    // Edge to edge: the shell's 16px gutters are undone so every screen's
    // video reaches the sides, the way the native twin draws it.
    return (
      <Box data-testid="city-launch-view" sx={{ mx: -2, mt: -2, minWidth: 0 }}>
        <CityLaunchHero
          status={status}
          city={city}
          locationId={locationId}
          minHeight={minHeight}
          header={header ? <Box sx={{ color: 'common.white' }}>{header}</Box> : null}
        />
        {LAUNCH_ROLE_SECTIONS.map((role) => (
          <CityLaunchRoleSection key={role.section} role={role} media={status.launch_media} minHeight={minHeight} />
        ))}
      </Box>
    );
  }

  let body;
  if (loading) {
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
      {header}
      {body}
    </Stack>
  );
}
