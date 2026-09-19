import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import LaunchCitiesTable from './LaunchCitiesTable';
import SubscribersTable from './SubscribersTable';
import {
  LOCATION_SUBSCRIPTION_CITIES,
  type LaunchCityRow,
  type LocationSubscriptionCity,
} from './queries';

interface CitiesData {
  locationSubscriptionCities: LocationSubscriptionCity[];
}

const toCityRow = (c: LocationSubscriptionCity): LaunchCityRow => ({
  id: c.location.id,
  city: c.location.city || c.location.location_name,
  location_image: c.location.location_image,
  is_launched: c.location.is_launched,
  subscriber_count: c.subscriber_count,
  notified_count: c.notified_count,
  pending_count: c.pending_count,
});

/**
 * Admin > Catalog > Subscribe for location — the members waiting for a city
 * that is not live yet, and the one button that tells them it is.
 *
 * Read-only apart from Send: a row is created by the member tapping "Notify me"
 * on the city's launch page, with the WhatsApp number from their profile.
 */
export default function LocationSubscriptionsPage() {
  const { t } = useTranslation();
  const subscribersRefetchRef = useRef<(() => void) | null>(null);
  const { data, error, refetch } = useQuery<CitiesData>(LOCATION_SUBSCRIPTION_CITIES, {
    fetchPolicy: 'network-only',
  });

  const cities = useMemo(() => (data?.locationSubscriptionCities ?? []).map(toCityRow), [data]);
  // The Subscribers table only exists for a picked city; nothing is listed before that.
  const [selectedCity, setSelectedCity] = useState<LaunchCityRow | null>(null);

  const onSent = useCallback(() => {
    refetch().catch((e: Error) => notifyError(e.message));
    subscribersRefetchRef.current?.();
  }, [refetch]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          {t('admin.locationSubscriptions.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.locationSubscriptions.intro')}
        </Typography>
      </Box>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Stack spacing={1}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
          {t('admin.locationSubscriptions.citiesTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('admin.locationSubscriptions.scenarioHint')}
        </Typography>
        <LaunchCitiesTable
          rows={cities}
          onSent={onSent}
          selectedId={selectedCity?.id ?? null}
          onSelect={setSelectedCity}
        />
      </Stack>

      {selectedCity ? (
        <Stack spacing={1}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
            {t('admin.locationSubscriptions.subscribersTitle')}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary' }}
            data-testid="location-subscriptions-selected-city"
          >
            {t('admin.locationSubscriptions.subscribersFor', { vars: { city: selectedCity.city } })}
          </Typography>
          <SubscribersTable city={selectedCity} refetchRef={subscribersRefetchRef} />
        </Stack>
      ) : (
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary' }}
          data-testid="location-subscriptions-pick-city"
        >
          {t('admin.locationSubscriptions.pickCity')}
        </Typography>
      )}
    </Stack>
  );
}
